// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import { Test } from "forge-std/Test.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Membership } from "../src/Membership.sol";

contract MembershipTest is Test {
    Membership private membership;

    address private owner = makeAddr("owner");
    address private alice = makeAddr("alice");
    address private bob = makeAddr("bob");
    address private carol = makeAddr("carol");
    address private stranger = makeAddr("stranger");

    function setUp() public {
        membership = new Membership(owner);
    }

    // ---------------------------------------------------------------
    // constructor / bootstrap
    // ---------------------------------------------------------------

    function test_constructor_registersOwnerAsGenesisMember() public view {
        assertTrue(membership.isMember(owner));
        Membership.Member memory m = membership.getMember(owner);
        assertTrue(m.isMember);
        assertEq(m.addedBy, address(0));
        assertEq(m.addedAt, block.timestamp);
        assertEq(membership.memberCount(), 1);
        assertEq(membership.memberAt(0), owner);
    }

    function test_constructor_setsOwnable() public view {
        assertEq(membership.owner(), owner);
    }

    function test_renounceOwnership_isDisabled() public {
        vm.prank(owner);
        vm.expectRevert(bytes("Membership: renounce disabled"));
        membership.renounceOwnership();
    }

    // ---------------------------------------------------------------
    // addMember
    // ---------------------------------------------------------------

    function test_addMember_byExistingMemberSucceeds() public {
        vm.expectEmit(true, true, false, true, address(membership));
        emit Membership.MemberAdded(alice, owner, block.timestamp);

        vm.prank(owner);
        membership.addMember(alice);

        assertTrue(membership.isMember(alice));
        Membership.Member memory m = membership.getMember(alice);
        assertEq(m.addedBy, owner);
        assertEq(membership.memberCount(), 2);
    }

    function test_addMember_doesNotRequireOtherApprovals() public {
        vm.prank(owner);
        membership.addMember(alice);

        // alice can add bob unilaterally, no approval from owner needed
        vm.prank(alice);
        membership.addMember(bob);

        assertTrue(membership.isMember(bob));
        assertEq(membership.getMember(bob).addedBy, alice);
        assertEq(membership.memberCount(), 3);
    }

    function test_addMember_byNonMemberReverts() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Membership.NotAMember.selector, stranger));
        membership.addMember(alice);
    }

    function test_addMember_zeroAddressReverts() public {
        vm.prank(owner);
        vm.expectRevert(Membership.ZeroAddress.selector);
        membership.addMember(address(0));
    }

    function test_addMember_duplicateReverts() public {
        vm.prank(owner);
        membership.addMember(alice);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(Membership.AlreadyAMember.selector, alice));
        membership.addMember(alice);
    }

    function test_addMember_cannotReAddRemovedMember_withoutBeingMemberAgain() public {
        // sanity: a removed non-owner cannot add themselves back since they are no longer a member
        vm.prank(owner);
        membership.addMember(alice);

        vm.prank(alice);
        membership.removeMember(alice);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Membership.NotAMember.selector, alice));
        membership.addMember(bob);
    }

    // ---------------------------------------------------------------
    // removeMember
    // ---------------------------------------------------------------

    function test_removeMember_selfRemovalSucceeds() public {
        vm.prank(owner);
        membership.addMember(alice);

        vm.expectEmit(true, true, false, true, address(membership));
        emit Membership.MemberRemoved(alice, alice);

        vm.prank(alice);
        membership.removeMember(alice);

        assertFalse(membership.isMember(alice));
        assertEq(membership.memberCount(), 1);
    }

    function test_removeMember_byOwnerSucceeds() public {
        vm.prank(owner);
        membership.addMember(alice);

        vm.prank(owner);
        membership.removeMember(alice);

        assertFalse(membership.isMember(alice));
    }

    function test_removeMember_byUnrelatedMemberReverts() public {
        vm.prank(owner);
        membership.addMember(alice);
        vm.prank(owner);
        membership.addMember(bob);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(Membership.NotAuthorizedToRemove.selector, bob, alice));
        membership.removeMember(alice);
    }

    function test_removeMember_byStrangerReverts() public {
        vm.prank(owner);
        membership.addMember(alice);

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Membership.NotAuthorizedToRemove.selector, stranger, alice));
        membership.removeMember(alice);
    }

    function test_removeMember_nonMemberReverts() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(Membership.NotAMember.selector, stranger));
        membership.removeMember(stranger);
    }

    function test_removeMember_ownerCanRemoveSelf() public {
        vm.prank(owner);
        membership.removeMember(owner);

        assertFalse(membership.isMember(owner));
        assertEq(membership.memberCount(), 0);
    }

    function test_removeMember_allMembersLeaving_bricksFurtherAdds() public {
        // Accepted per design doc 001 section 2.4: this is treated as
        // "the association has ended", not a bug to work around.
        vm.prank(owner);
        membership.removeMember(owner);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(Membership.NotAMember.selector, owner));
        membership.addMember(alice);
    }

    // ---------------------------------------------------------------
    // memberList bookkeeping (swap-and-pop correctness)
    // ---------------------------------------------------------------

    function test_removeMember_middleOfList_keepsOthersEnumerable() public {
        vm.startPrank(owner);
        membership.addMember(alice);
        membership.addMember(bob);
        membership.addMember(carol);
        vm.stopPrank();
        // list: [owner, alice, bob, carol]

        vm.prank(owner);
        membership.removeMember(alice);
        // swap-and-pop moves carol into alice's old slot: [owner, carol, bob]

        assertEq(membership.memberCount(), 3);
        assertTrue(membership.isMember(owner));
        assertTrue(membership.isMember(bob));
        assertTrue(membership.isMember(carol));
        assertFalse(membership.isMember(alice));

        // every remaining member must still be reachable via memberAt
        bool sawOwner;
        bool sawBob;
        bool sawCarol;
        for (uint256 i = 0; i < membership.memberCount(); i++) {
            address a = membership.memberAt(i);
            if (a == owner) sawOwner = true;
            if (a == bob) sawBob = true;
            if (a == carol) sawCarol = true;
        }
        assertTrue(sawOwner && sawBob && sawCarol);
    }

    function test_removeMember_lastOfList_popsCleanly() public {
        vm.startPrank(owner);
        membership.addMember(alice);
        membership.addMember(bob);
        vm.stopPrank();
        // list: [owner, alice, bob]

        vm.prank(bob);
        membership.removeMember(bob);

        assertEq(membership.memberCount(), 2);
        assertEq(membership.memberAt(0), owner);
        assertEq(membership.memberAt(1), alice);
    }

    function test_addMember_afterRemoval_reusesFreedSlot() public {
        vm.startPrank(owner);
        membership.addMember(alice);
        membership.addMember(bob);
        vm.stopPrank();

        vm.prank(alice);
        membership.removeMember(alice);

        vm.prank(owner);
        membership.addMember(carol);

        assertEq(membership.memberCount(), 3);
        assertTrue(membership.isMember(carol));
        assertEq(membership.getMember(carol).addedBy, owner);
    }
}
