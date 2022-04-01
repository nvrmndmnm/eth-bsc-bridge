import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract, ContractFactory } from "ethers";
import { ethers } from "hardhat";

const { expect } = require("chai");

const DEFAULT_SYMBOL = "BGT";

describe("Bridge contract", () => {
    let Token: ContractFactory;
    let tokenEth: Contract;
    let tokenBsc: Contract;
    let Bridge: ContractFactory;
    let bridgeEth: Contract;
    let bridgeBsc: Contract;
    let owner: SignerWithAddress;
    let addr1: SignerWithAddress;
    let addr2: SignerWithAddress;

    beforeEach(async () => {
        Token = await ethers.getContractFactory("Token");
        Bridge = await ethers.getContractFactory("Bridge");

        [owner, addr1, addr2] = await ethers.getSigners();

        tokenEth = await Token.deploy("Big G Token", "BGT");
        tokenBsc = await Token.deploy("Big G Token", "BGT");
        bridgeEth = await Bridge.deploy(owner.address, 1);
        bridgeBsc = await Bridge.deploy(owner.address, 2);

        await tokenEth.mint(addr1.address, 1000);
        await tokenEth.transferOwnership(bridgeEth.address);
        await tokenBsc.transferOwnership(bridgeBsc.address);

        await bridgeEth.includeToken(DEFAULT_SYMBOL, tokenEth.address);
        await bridgeBsc.includeToken(DEFAULT_SYMBOL, tokenBsc.address);
    });

    describe("Deployment", () => {
        it("Should assign ETH chain ID", async () => {
            expect(await bridgeEth.chainId()).to.equal(1);
        });

        it("Should assign BSC chain ID", async () => {
            expect(await bridgeBsc.chainId()).to.equal(2);
        });

        it("Should mint initial balance", async () => {
            expect(await tokenEth.balanceOf(addr1.address)).to.equal(1000);
        });
    });

    describe("Swap tokens", () => {
        it("Should burn tokens that have to be swapped", async () => {
            let initialSupply = await tokenEth.totalSupply();
            await bridgeEth.connect(addr1).swap(addr1.address, 100, 1, 2, 1, DEFAULT_SYMBOL);
            expect(await tokenEth.balanceOf(addr1.address)).to.equal(900);
            expect(await tokenEth.totalSupply()).to.equal(initialSupply.sub(100));
        });

        it("Should revert the wrong chain call", async () => {
            await expect(bridgeEth.connect(addr1).swap(addr1.address, 100, 3, 2, 1, DEFAULT_SYMBOL))
                .to.be.revertedWith("Sender's chain must match the contract's chain");
        });

        it("Should revert if token not allowed", async () => {
            await expect(bridgeEth.connect(addr1).swap(addr1.address, 100, 1, 2, 1, "SYMB"))
                .to.be.revertedWith("Token must be allowed");
        });

        it("Should revert the same call", async () => {
            await bridgeEth.connect(addr1).swap(addr1.address, 100, 1, 2, 1, DEFAULT_SYMBOL);
            await expect(bridgeEth.connect(addr1).swap(addr1.address, 100, 1, 2, 1, DEFAULT_SYMBOL))
                .to.be.revertedWith("Already processed");
        });

        it("Should emit Transfer event", async () => {
            await expect(bridgeEth.connect(addr1).swap(addr1.address, 100, 1, 2, 1, DEFAULT_SYMBOL)).to.emit(bridgeEth, "Transfer")
                .withArgs(addr1.address, addr1.address, 100, 1, 2, 1, tokenEth.address);
        });
    });

    describe("Redeem tokens", () => {
        it("Should mint tokens to the recepient address", async () => {
            let msg = ethers.utils.solidityKeccak256(
                ["address", "uint256"], [addr1.address, 100]);

            let signature = await owner.signMessage(ethers.utils.arrayify(msg));
            let sig = ethers.utils.splitSignature(signature);
            await bridgeEth.connect(addr1).swap(addr2.address, 100, 1, 2, 1, DEFAULT_SYMBOL);
            await bridgeBsc.connect(addr1).redeem(addr2.address, 100, 1, 2, 1, DEFAULT_SYMBOL, sig.v, sig.r, sig.s);
            expect(await tokenBsc.balanceOf(addr2.address)).to.equal(100);
        });

        it("Should revert call from non-owner address", async () => {
            let msg = ethers.utils.solidityKeccak256(
                ["address", "uint256"], [addr1.address, 100]);

            let signature = await owner.signMessage(ethers.utils.arrayify(msg));
            let sig = await ethers.utils.splitSignature(signature);
            await bridgeEth.connect(addr1).swap(addr1.address, 100, 1, 2, 1, DEFAULT_SYMBOL);
            await expect(bridgeBsc.connect(owner).redeem(addr1.address, 100, 1, 2, 1, DEFAULT_SYMBOL, sig.v, sig.r, sig.s))
                .to.be.revertedWith("Signature doesn't match");
        });

        it("Should revert the wrong chain call", async () => {
            let msg = ethers.utils.solidityKeccak256(
                ["address", "uint256"], [addr1.address, 100]);

            let signature = await owner.signMessage(ethers.utils.arrayify(msg));
            let sig = ethers.utils.splitSignature(signature);
            await bridgeEth.connect(addr1).swap(addr1.address, 100, 1, 2, 1, DEFAULT_SYMBOL);
            await expect(bridgeBsc.connect(addr1).redeem(addr2.address, 100, 1, 4, 1, DEFAULT_SYMBOL, sig.v, sig.r, sig.s))
                .to.be.revertedWith("Recipient's chain must match the contract's chain");
        });

        it("Should revert if token not allowed", async () => {
            let msg = ethers.utils.solidityKeccak256(
                ["address", "uint256"], [addr1.address, 100]);

            let signature = await owner.signMessage(ethers.utils.arrayify(msg));
            let sig = ethers.utils.splitSignature(signature);
            await bridgeEth.connect(addr1).swap(addr1.address, 100, 1, 2, 1, DEFAULT_SYMBOL);
            await expect(bridgeBsc.connect(addr1).redeem(addr2.address, 100, 1, 2, 1, "SYMB", sig.v, sig.r, sig.s))
                .to.be.revertedWith("Token must be allowed");
        });

        it("Should revert the same call", async () => {
            let msg = ethers.utils.solidityKeccak256(
                ["address", "uint256"], [addr1.address, 100]);

            let signature = await owner.signMessage(ethers.utils.arrayify(msg));
            let sig = ethers.utils.splitSignature(signature);
            await bridgeEth.connect(addr1).swap(addr1.address, 100, 1, 2, 1, DEFAULT_SYMBOL);
            await bridgeBsc.connect(addr1).redeem(addr2.address, 100, 1, 2, 1, DEFAULT_SYMBOL, sig.v, sig.r, sig.s);
            await expect(bridgeBsc.connect(addr1).redeem(addr2.address, 100, 1, 2, 1, DEFAULT_SYMBOL, sig.v, sig.r, sig.s))
                .to.be.revertedWith("Already processed");
        });

        it("Should emit Transfer event", async () => {
            let msg = ethers.utils.solidityKeccak256(
                ["address", "uint256"], [addr1.address, 100]);

            let signature = await owner.signMessage(ethers.utils.arrayify(msg));
            let sig = ethers.utils.splitSignature(signature);
            await bridgeEth.connect(addr1).swap(addr2.address, 100, 1, 2, 1, DEFAULT_SYMBOL);
            await expect(bridgeBsc.connect(addr1).redeem(addr2.address, 100, 1, 2, 1, DEFAULT_SYMBOL, sig.v, sig.r, sig.s))
                .to.emit(bridgeBsc, "Transfer")
                .withArgs(addr1.address, addr2.address, 100, 1, 2, 1, tokenBsc.address);
        });
    });

    describe("Service functions", () => {
        it("Should set chain by ID", async () => {
            await bridgeEth.updateChainById(3);
            expect(await bridgeEth.chainId()).to.equal(3);
        });

        it("Should add tokens to bridge", async () => {
            await bridgeEth.includeToken("TGT", owner.address);
            expect(await bridgeEth.allowedTokens("TGT")).to.equal(owner.address);
        });

        it("Should remove tokens from bridge", async () => {
            await bridgeEth.excludeToken(DEFAULT_SYMBOL);
            expect(await bridgeEth.allowedTokens(DEFAULT_SYMBOL)).to.equal(ethers.constants.AddressZero);
        });
    });
});