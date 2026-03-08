// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract InvoiceNFT is ERC721, Ownable {

    enum Status {
        Created,
        Confirmed,
        Funded,
        Repaid,
        Defaulted
    }

    struct Invoice {
        address issuer;
        address debtor;
        uint256 amount;
        uint256 dueDate;
        uint256 fundedAmount;
        address funder;
        bool debtorConfirmed;
        Status status;
        string metadataURI;
    }

    error NotDebtor();
    error InvalidStatus();
    error InvalidAmount();
    error InvalidDueDate();
    error UnauthorizedPool();

    uint256 public nextInvoiceId;

    mapping(uint256 => Invoice) private invoices;

    address public financingPool;

    event FinancingPoolSet(address indexed pool);

    event InvoiceCreated(
        uint256 indexed invoiceId,
        address indexed issuer,
        address indexed debtor,
        uint256 amount,
        uint256 dueDate
    );

    event InvoiceConfirmed(uint256 indexed invoiceId);

    event InvoiceFunded(
        uint256 indexed invoiceId,
        address indexed funder,
        uint256 amount
    );

    event InvoiceRepaid(uint256 indexed invoiceId);
    event InvoiceDefaulted(uint256 indexed invoiceId);

    modifier onlyPool() {
        if(msg.sender != financingPool) revert UnauthorizedPool();
        _;
    }

    constructor() 
        ERC721("CreditFlow Invoice", "CFINV") 
        Ownable(msg.sender)
    {}

    function setFinancingPool(address pool) external onlyOwner {
        financingPool = pool;
        emit FinancingPoolSet(pool);
    }

    function createInvoice(
        address debtor,
        uint256 amount,
        uint256 dueDate,
        string calldata metadataURI
    ) external returns (uint256 id) {

        if(amount == 0) revert InvalidAmount();
        if(dueDate <= block.timestamp) revert InvalidDueDate();

        id = nextInvoiceId;
        nextInvoiceId++;

        invoices[id] = Invoice({
            issuer: msg.sender,
            debtor: debtor,
            amount: amount,
            dueDate: dueDate,
            fundedAmount: 0,
            funder: address(0),
            debtorConfirmed: false,
            status: Status.Created,
            metadataURI: metadataURI
        });

        _mint(msg.sender, id);

        emit InvoiceCreated(id,msg.sender,debtor,amount,dueDate);
    }

    function confirmInvoice(uint256 id) external {

        Invoice storage inv = invoices[id];

        if(msg.sender != inv.debtor) revert NotDebtor();
        if(inv.status != Status.Created) revert InvalidStatus();

        inv.debtorConfirmed = true;
        inv.status = Status.Confirmed;

        emit InvoiceConfirmed(id);
    }

    function markFunded(
        uint256 id,
        address funder,
        uint256 amount
    ) external onlyPool {

        Invoice storage inv = invoices[id];

        if(inv.status != Status.Confirmed) revert InvalidStatus();

        inv.status = Status.Funded;
        inv.funder = funder;
        inv.fundedAmount = amount;

        emit InvoiceFunded(id,funder,amount);
    }

    function markRepaid(uint256 id) external onlyPool {

        Invoice storage inv = invoices[id];

        if(inv.status != Status.Funded) revert InvalidStatus();

        inv.status = Status.Repaid;

        emit InvoiceRepaid(id);
    }

    function getInvoice(uint256 id)
        external
        view
        returns (Invoice memory)
    {
        return invoices[id];
    }

    function totalInvoices() external view returns (uint256) {
        return nextInvoiceId;
    }

    function markDefault(uint256 id) external onlyPool {
        Invoice storage inv = invoices[id];
        if(inv.status != Status.Funded) revert InvalidStatus();
        inv.status = Status.Defaulted;
        emit InvoiceDefaulted(id);
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("Invoice NFTs are non transferable");
        }
        return super._update(to, tokenId, auth);
    }
}