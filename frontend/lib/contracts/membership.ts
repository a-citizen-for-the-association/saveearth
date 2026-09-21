import type { Address } from "viem";
import { mainnet, sepolia } from "viem/chains";
import { polkadotHub, polkadotHubTestnet } from "../wagmi";

// NOTE: each `process.env.NEXT_PUBLIC_...` access below must stay a static,
// literal property access — Next.js inlines these at build time and cannot
// resolve a dynamically constructed key (e.g. `process.env[computedName]`)
// in the client bundle.
const MEMBERSHIP_ADDRESSES: Partial<Record<number, Address>> = {
  [mainnet.id]: process.env.NEXT_PUBLIC_MEMBERSHIP_ADDRESS_1 as Address | undefined,
  [sepolia.id]: process.env.NEXT_PUBLIC_MEMBERSHIP_ADDRESS_11155111 as Address | undefined,
  [polkadotHub.id]: process.env.NEXT_PUBLIC_MEMBERSHIP_ADDRESS_420420419 as Address | undefined,
  [polkadotHubTestnet.id]: process.env.NEXT_PUBLIC_MEMBERSHIP_ADDRESS_420420417 as Address | undefined,
};

/** Undefined means "no Membership deployment configured for this chain yet". */
export function membershipAddress(chainId: number): Address | undefined {
  return MEMBERSHIP_ADDRESSES[chainId];
}

export const membershipAbi = [
  {
    type: "constructor",
    inputs: [{ name: "initialOwner", type: "address", internalType: "address" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "addMember",
    inputs: [{ name: "newMember", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getMember",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct Membership.Member",
        components: [
          { name: "isMember", type: "bool", internalType: "bool" },
          { name: "addedBy", type: "address", internalType: "address" },
          { name: "addedAt", type: "uint40", internalType: "uint40" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isMember",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "memberAt",
    inputs: [{ name: "index", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "memberCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "removeMember",
    inputs: [{ name: "member", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [{ name: "newOwner", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "MemberAdded",
    inputs: [
      { name: "member", type: "address", indexed: true, internalType: "address" },
      { name: "addedBy", type: "address", indexed: true, internalType: "address" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MemberRemoved",
    inputs: [
      { name: "member", type: "address", indexed: true, internalType: "address" },
      { name: "removedBy", type: "address", indexed: true, internalType: "address" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      { name: "previousOwner", type: "address", indexed: true, internalType: "address" },
      { name: "newOwner", type: "address", indexed: true, internalType: "address" },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "AlreadyAMember",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "NotAMember",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "NotAuthorizedToRemove",
    inputs: [
      { name: "caller", type: "address", internalType: "address" },
      { name: "target", type: "address", internalType: "address" },
    ],
  },
  {
    type: "error",
    name: "OwnableInvalidOwner",
    inputs: [{ name: "owner", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "OwnableUnauthorizedAccount",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
  },
  { type: "error", name: "ZeroAddress", inputs: [] },
] as const;
