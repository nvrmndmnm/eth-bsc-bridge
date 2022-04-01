import { ethers } from "hardhat";
import 'dotenv/config';

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    console.log("Account balance:", (await deployer.getBalance()).toString());
    const Token = await ethers.getContractFactory("Token");
    const token = await Token.deploy("Big G Token", "BGT");
    await token.deployed();

    await token.mint(deployer.address, ethers.utils.parseEther("10000"));

    console.log("Token address: ", token.address);

    const Bridge = await ethers.getContractFactory("Bridge");
    const bridge = await Bridge.deploy(4);
    await bridge.deployed();

    await token.transferOwnership(bridge.address);
    await bridge.includeToken(await token.symbol(), token.address);

    console.log("Bridge address:", bridge.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });