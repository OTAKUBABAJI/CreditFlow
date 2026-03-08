// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IInvoiceNFT {

    struct Invoice {
        address issuer;
        address debtor;
        uint256 amount;
        uint256 dueDate;
        uint256 fundedAmount;
        address funder;
        bool debtorConfirmed;
        uint8 status;
        string metadataURI;
    }

    function getInvoice(uint256 id)
    external view returns (Invoice memory);

    function markFunded(
        uint256 id,
        address funder,
        uint256 amount
    ) external;

    function markRepaid(uint256 id) external;
    
    function markDefault(uint256 id) external;
}

interface IReputation {

    function recordInvoice(address sme) external;

    function recordRepayment(address sme) external;
    
    function recordDefault(address sme) external;

    function getPricing(address sme)
    external view returns(uint256,uint256);
}

contract FinancingPool is ReentrancyGuard, Ownable {

    using SafeERC20 for IERC20;

    uint256 constant BPS = 10000;

    IERC20 public immutable token;

    IInvoiceNFT public invoiceNFT;
    IReputation public reputation;

    uint256 public totalLiquidity;
    uint256 public totalShares;
    
    mapping(address => uint256) public shares;
    
    address public treasury;

    event Deposit(address indexed lp,uint256 amount);
    event Withdraw(address indexed lp,uint256 amount);

    event InvoiceFunded(
        uint256 indexed invoiceId,
        address indexed funder,
        uint256 advance
    );

    event InvoiceRepaid(
        uint256 indexed invoiceId,
        uint256 fee
    );
    
    event InvoiceDefaulted(uint256 indexed invoiceId);

    constructor(
        address tokenAddr,
        address invoiceAddr,
        address repAddr
    ) Ownable(msg.sender) {
        token = IERC20(tokenAddr);
        invoiceNFT = IInvoiceNFT(invoiceAddr);
        reputation = IReputation(repAddr);
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    function deposit(uint256 amount) external nonReentrant {

        require(amount > 0,"invalid amount");
        
        uint256 sharesToMint = 0;
        if (totalShares == 0 || totalLiquidity == 0) {
            sharesToMint = amount;
        } else {
            sharesToMint = (amount * totalShares) / totalLiquidity;
        }

        token.safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        shares[msg.sender] += sharesToMint;
        totalShares += sharesToMint;

        totalLiquidity += amount;

        emit Deposit(msg.sender,amount);
    }

    function withdraw(uint256 shareAmount) external nonReentrant {

        require(
            shares[msg.sender] >= shareAmount,
            "not enough balance"
        );
        
        uint256 amount = (shareAmount * totalLiquidity) / totalShares;

        shares[msg.sender] -= shareAmount;
        totalShares -= shareAmount;

        totalLiquidity -= amount;

        token.safeTransfer(msg.sender,amount);

        emit Withdraw(msg.sender,amount);
    }

    function fundInvoice(uint256 id)
    external
    nonReentrant
    {

        IInvoiceNFT.Invoice memory inv =
        invoiceNFT.getInvoice(id);

        require(inv.status == 1,"not confirmed");
        require(inv.debtorConfirmed,"not verified");
        require(inv.funder == address(0), "invoice already funded");
        require(
            block.timestamp < inv.dueDate,
            "invoice expired"
        );

        (
            uint256 advanceRate,
           
        ) = reputation.getPricing(inv.issuer);

        uint256 advance =
        (inv.amount * advanceRate) / BPS;

        require(
            advance <= totalLiquidity,
            "insufficient liquidity"
        );

        totalLiquidity -= advance;

        token.safeTransfer(inv.issuer,advance);

        invoiceNFT.markFunded(
            id,
            msg.sender,
            advance
        );

        reputation.recordInvoice(inv.issuer);

        emit InvoiceFunded(id,msg.sender,advance);
    }

    function repayInvoice(uint256 id)
    external
    nonReentrant
    {

        IInvoiceNFT.Invoice memory inv =
        invoiceNFT.getInvoice(id);

        require(inv.status == 2,"not funded");
        require(msg.sender == inv.debtor, "only debtor can repay");

        (
            ,
            uint256 feeRate
        ) = reputation.getPricing(inv.issuer);

        token.safeTransferFrom(
            msg.sender,
            address(this),
            inv.amount
        );

        uint256 fee =
        (inv.amount * feeRate) / BPS;

        uint256 reserve =
        inv.amount - inv.fundedAmount;

        uint256 payout =
        reserve - fee;

        if(payout > 0)
            token.safeTransfer(inv.issuer,payout);
            
        if(fee > 0 && treasury != address(0)) {
            token.safeTransfer(treasury, fee);
        } else if (fee > 0) {
            totalLiquidity += fee;
        }

        totalLiquidity += inv.fundedAmount;

        invoiceNFT.markRepaid(id);

        reputation.recordRepayment(inv.issuer);

        emit InvoiceRepaid(id,fee);
    }
    
    function markDefault(uint256 id) external nonReentrant {
        IInvoiceNFT.Invoice memory inv = invoiceNFT.getInvoice(id);
        require(inv.status == 2, "not funded");
        require(block.timestamp > inv.dueDate, "not yet due");
        
        invoiceNFT.markDefault(id);
        reputation.recordDefault(inv.issuer);
        
        emit InvoiceDefaulted(id);
    }
}