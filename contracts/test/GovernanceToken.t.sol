// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import { Test } from "forge-std/Test.sol";
import { IERC20Errors } from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import { GovernanceToken } from "../src/GovernanceToken.sol";

contract GovernanceTokenTest is Test {
    GovernanceToken private token;

    address private holder = makeAddr("holder");

    function setUp() public {
        token = new GovernanceToken(holder);
    }

    function test_constructor_mintsInitialSupplyToHolder() public view {
        assertEq(token.balanceOf(holder), token.INITIAL_SUPPLY());
        assertEq(token.totalSupply(), token.INITIAL_SUPPLY());
    }

    function test_initialSupply_isOneTrillionTokensWithEighteenDecimals() public view {
        assertEq(token.INITIAL_SUPPLY(), 1_000_000_000_000 * 10 ** 18);
        assertEq(token.decimals(), 18);
    }

    function test_metadata_nameAndSymbol() public view {
        assertEq(token.name(), "SaveEarth Governance Token");
        assertEq(token.symbol(), "SEG");
    }

    function test_constructor_revertsOnZeroAddressHolder() public {
        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InvalidReceiver.selector, address(0)));
        new GovernanceToken(address(0));
    }

    function test_transfer_movesBalanceBetweenHolders() public {
        address recipient = makeAddr("recipient");

        vm.prank(holder);
        token.transfer(recipient, 1_000 * 10 ** 18);

        assertEq(token.balanceOf(recipient), 1_000 * 10 ** 18);
        assertEq(token.balanceOf(holder), token.INITIAL_SUPPLY() - 1_000 * 10 ** 18);
    }

    function test_noMintOrBurnFunctionIsExposed() public {
        // GovernanceToken deliberately exposes no public/external mint or
        // burn function (ADR-0006: fixed supply). Assert this at the ABI
        // level — a raw low-level call to the common OZ ERC20Mintable/
        // ERC20Burnable selectors must fail to resolve to any function.
        (bool mintOk,) = address(token).call(abi.encodeWithSignature("mint(address,uint256)", holder, 1));
        assertFalse(mintOk);

        (bool burnOk,) = address(token).call(abi.encodeWithSignature("burn(uint256)", 1));
        assertFalse(burnOk);
    }
}
