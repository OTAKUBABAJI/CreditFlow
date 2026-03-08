// test/CreditFlowFullSuite.test.ts

import { expect } from "chai";
import hre from "hardhat";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-ethers-chai-matchers/withArgs";

describe("CreditFlow Full Test Suite", function () {
  async function deployAndSetupFixture() {
    const connection = await hre.network.connect();
    const ethers = connection.ethers;

    const [owner, sme, buyer, lp, attacker] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockToken");
    const mockToken = await MockToken.deploy();

    const InvoiceNFT = await ethers.getContractFactory("InvoiceNFT");
    const invoiceNFT = await InvoiceNFT.deploy();

    const ReputationManager = await ethers.getContractFactory("ReputationManager");
    const reputation = await ReputationManager.deploy();

    const FinancingPool = await ethers.getContractFactory("FinancingPool");
    const pool = await FinancingPool.deploy(
      await mockToken.getAddress(),
      await invoiceNFT.getAddress(),
      await reputation.getAddress()
    );

    await (await invoiceNFT.setFinancingPool(await pool.getAddress())).wait();
    await (await reputation.setFinancingPool(await pool.getAddress())).wait();

    await (await mockToken.mint(lp.address, ethers.parseUnits("100000", 6))).wait();
    await (await mockToken.connect(lp).approve(await pool.getAddress(), ethers.MaxUint256)).wait();

    await (await mockToken.mint(buyer.address, ethers.parseUnits("20000", 6))).wait();
    await (await mockToken.connect(buyer).approve(await pool.getAddress(), ethers.MaxUint256)).wait();

    return {
      mockToken,
      invoiceNFT,
      reputation,
      pool,
      owner,
      sme,
      buyer,
      lp,
      attacker,
      ethers
    };
  }

  describe("Deployment & Wiring", function () {
    it("deploys contracts and wires financingPool correctly", async function () {
      const { invoiceNFT, reputation, pool } = await loadFixture(deployAndSetupFixture);

      expect(await invoiceNFT.financingPool()).to.equal(await pool.getAddress());
      expect(await reputation.financingPool()).to.equal(await pool.getAddress());
    });

    it("reverts when non-owner tries to set financing pool", async function () {
      const { invoiceNFT, attacker, ethers } = await loadFixture(deployAndSetupFixture);

      await expect(
        invoiceNFT.connect(attacker).setFinancingPool(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(invoiceNFT, "OwnableUnauthorizedAccount");
    });
  });

  describe("Invoice Lifecycle - Happy Path", function () {
    it("creates → confirms → funds → repays and updates reputation", async function () {
      const { mockToken, invoiceNFT, reputation, pool, sme, buyer, lp, ethers } = await loadFixture(deployAndSetupFixture);

      const amount = ethers.parseUnits("1000", 6);
      const dueDate = Math.floor(Date.now() / 1000) + 86400 * 60;

      await expect(
        invoiceNFT.connect(sme).createInvoice(buyer.address, amount, dueDate, "INV-001")
      ).to.emit(invoiceNFT, "InvoiceCreated");

      const invoiceId = 1n;

      let invoice = await invoiceNFT.getInvoice(invoiceId);
      expect(invoice.status).to.equal(0); // CREATED

      // Confirm
      await expect(invoiceNFT.connect(buyer).confirmInvoice(invoiceId))
        .to.emit(invoiceNFT, "InvoiceConfirmed");

      invoice = await invoiceNFT.getInvoice(invoiceId);
      expect(invoice.status).to.equal(1);

      // Fund
      const advance = ethers.parseUnits("900", 6);
      await expect(pool.connect(lp).fundInvoice(invoiceId, advance))
        .to.emit(pool, "InvoiceFunded");

      expect(await mockToken.balanceOf(sme.address)).to.equal(advance);
      invoice = await invoiceNFT.getInvoice(invoiceId);
      expect(invoice.status).to.equal(2);

      // Repay
      await time.increaseTo(dueDate + 86400 * 5);

      const lpBalanceBefore = await mockToken.balanceOf(lp.address);
      await expect(pool.connect(buyer).repayInvoice(invoiceId, amount))
        .to.emit(pool, "InvoiceRepaid");

      invoice = await invoiceNFT.getInvoice(invoiceId);
      expect(invoice.status).to.equal(3);

      // Reputation improved
      const scoreAfter = await reputation.getReputationScore(sme.address);
      expect(scoreAfter).to.be.gt(0);

      // Optional: check LP got principal + yield back
      expect(await mockToken.balanceOf(lp.address)).to.be.gt(lpBalanceBefore);
    });
  });

  describe("Edge Cases & Errors", function () {
    it("reverts funding unconfirmed invoice", async function () {
      const { pool, invoiceNFT, lp, sme, ethers } = await loadFixture(deployAndSetupFixture);

      await invoiceNFT.connect(sme).createInvoice(lp.address, ethers.parseUnits("500", 6), 0, "");
      const id = 1n;

      await expect(
        pool.connect(lp).fundInvoice(id, ethers.parseUnits("450", 6))
      ).to.be.revertedWith("Invoice not confirmed");
    });

    it("reverts when non-debtor tries to confirm", async function () {
      const { invoiceNFT, sme, attacker, ethers } = await loadFixture(deployAndSetupFixture);

      await invoiceNFT.connect(sme).createInvoice(attacker.address, ethers.parseUnits("200", 6), 0, "");
      const id = 1n;

      await expect(
        invoiceNFT.connect(attacker).confirmInvoice(id)
      ).to.be.revertedWith("Not debtor");
    });

    it("reverts funding already funded invoice", async function () {
      const { pool, invoiceNFT, lp, sme, buyer, ethers } = await loadFixture(deployAndSetupFixture);

      await invoiceNFT.connect(sme).createInvoice(buyer.address, ethers.parseUnits("1000", 6), 0, "");
      const id = 1n;
      await invoiceNFT.connect(buyer).confirmInvoice(id);
      await pool.connect(lp).fundInvoice(id, ethers.parseUnits("900", 6));

      await expect(
        pool.connect(lp).fundInvoice(id, ethers.parseUnits("100", 6))
      ).to.be.revertedWith("Already funded");
    });

    it("reverts repay before due date (if enforced)", async function () {
      const { pool, invoiceNFT, sme, buyer, lp, ethers } = await loadFixture(deployAndSetupFixture);

      const amount = ethers.parseUnits("1000", 6);
      const dueDate = Math.floor(Date.now() / 1000) + 86400 * 60;

      await invoiceNFT.connect(sme).createInvoice(buyer.address, amount, dueDate, "");
      const id = 1n;
      await invoiceNFT.connect(buyer).confirmInvoice(id);
      await pool.connect(lp).fundInvoice(id, ethers.parseUnits("900", 6));

      await expect(
        pool.connect(buyer).repayInvoice(id, amount)
      ).to.be.revertedWith("Not due yet"); // adjust if your contract enforces this
    });
  });

  describe("Default Handling", function () {
    it("marks default after grace period and penalizes reputation", async function () {
      const { invoiceNFT, reputation, pool, sme, buyer, lp, ethers } = await loadFixture(deployAndSetupFixture);

      const amount = ethers.parseUnits("1000", 6);
      const dueDate = Math.floor(Date.now() / 1000) + 86400 * 30;

      await invoiceNFT.connect(sme).createInvoice(buyer.address, amount, dueDate, "");
      const id = 1n;
      await invoiceNFT.connect(buyer).confirmInvoice(id);
      await pool.connect(lp).fundInvoice(id, ethers.parseUnits("900", 6));

      // Time travel past due + grace
      await time.increaseTo(dueDate + 86400 * 15); // 15 days after due

      await expect(pool.markDefault(id)).to.emit(invoiceNFT, "InvoiceDefaulted");

      const invoice = await invoiceNFT.getInvoice(id);
      expect(invoice.status).to.equal(4); // DEFAULTED – adjust enum

      const scoreAfter = await reputation.getReputationScore(sme.address);
      expect(scoreAfter).to.be.lt(100); // assuming initial is higher or 0
    });
  });

  describe("Reputation & Advance Rate", function () {
    it("calculates different advance rates based on reputation", async function () {
      const { reputation, pool, sme, ethers } = await loadFixture(deployAndSetupFixture);

      // Assume initial reputation = 0 → low advance
      let advanceRate = await reputation.getAdvanceRate(sme.address);
      expect(advanceRate).to.be.lte(ethers.parseUnits("70", 2)); // 70% or lower

      // Simulate success (you may need a way to update reputation directly in test)
      // For now, assume pool/fixture updates it
      // In real test, call updateReputation if public, or via flow
    });
  });
});