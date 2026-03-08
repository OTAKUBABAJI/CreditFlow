// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ReputationManager is Ownable {

    struct Reputation {
        uint256 totalInvoices;
        uint256 repaidInvoices;
    }

    mapping(address => Reputation) public reputations;

    address public financingPool;

    error UnauthorizedPool();

    event FinancingPoolSet(address indexed pool);
    event InvoiceRecorded(address indexed sme);
    event RepaymentRecorded(address indexed sme);
    event DefaultRecorded(address indexed sme);

    modifier onlyPool() {
        if(msg.sender != financingPool) revert UnauthorizedPool();
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setFinancingPool(address pool) external onlyOwner {
        financingPool = pool;
        emit FinancingPoolSet(pool);
    }

    function recordInvoice(address sme) external onlyPool {
        reputations[sme].totalInvoices++;
        emit InvoiceRecorded(sme);
    }

    function recordRepayment(address sme) external onlyPool {
        reputations[sme].repaidInvoices++;
        emit RepaymentRecorded(sme);
    }

    function recordDefault(address sme) external onlyPool {
        reputations[sme].totalInvoices++;
        emit DefaultRecorded(sme);
    }

    function getScore(address sme) public view returns(uint256){

        Reputation memory r = reputations[sme];

        if(r.totalInvoices == 0)
            return 50;

        return
        (r.repaidInvoices * 100) /
        r.totalInvoices;
    }

    function getPricing(address sme)
        external
        view
        returns(uint256 advanceRate,uint256 feeRate)
    {

        uint256 score = getScore(sme);

        if(score >= 80)
            return (9000,100);

        if(score >= 50)
            return (8000,200);

        return (7000,300);
    }
}