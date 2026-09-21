import type { Address } from "viem";
import { foundry, mainnet, sepolia } from "viem/chains";
import { polkadotHub, polkadotHubTestnet } from "../wagmi";

// See the note in membership.ts about why these must stay static accesses.
const COMMUNITY_BOARD_ADDRESSES: Partial<Record<number, Address>> = {
  [mainnet.id]: process.env.NEXT_PUBLIC_COMMUNITY_BOARD_ADDRESS_1 as Address | undefined,
  [sepolia.id]: process.env.NEXT_PUBLIC_COMMUNITY_BOARD_ADDRESS_11155111 as Address | undefined,
  [polkadotHub.id]: process.env.NEXT_PUBLIC_COMMUNITY_BOARD_ADDRESS_420420419 as Address | undefined,
  [polkadotHubTestnet.id]: process.env.NEXT_PUBLIC_COMMUNITY_BOARD_ADDRESS_420420417 as Address | undefined,
  // Local Anvil, set only by e2e/global-setup.ts — never in a real .env file.
  [foundry.id]: process.env.NEXT_PUBLIC_COMMUNITY_BOARD_ADDRESS_31337 as Address | undefined,
};

/** Undefined means "no CommunityBoard deployment configured for this chain yet". */
export function communityBoardAddress(chainId: number): Address | undefined {
  return COMMUNITY_BOARD_ADDRESSES[chainId];
}

export const communityBoardAbi = [
  {
    type: "constructor",
    inputs: [
      { name: "initialOwner", type: "address", internalType: "address" },
      { name: "membershipAddress", type: "address", internalType: "address" },
      { name: "governanceTokenAddress", type: "address", internalType: "address" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "addChatRoom",
    inputs: [
      { name: "label", type: "string", internalType: "string" },
      { name: "url", type: "string", internalType: "string" },
    ],
    outputs: [{ name: "id", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "addMessage",
    inputs: [{ name: "content", type: "string", internalType: "string" }],
    outputs: [{ name: "id", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "chatRoomCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getActiveChatRooms",
    inputs: [],
    outputs: [
      {
        name: "active",
        type: "tuple[]",
        internalType: "struct CommunityBoard.ChatRoom[]",
        components: [
          { name: "label", type: "string", internalType: "string" },
          { name: "url", type: "string", internalType: "string" },
          { name: "active", type: "bool", internalType: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getActiveMessages",
    inputs: [],
    outputs: [
      {
        name: "active",
        type: "tuple[]",
        internalType: "struct CommunityBoard.Message[]",
        components: [
          { name: "content", type: "string", internalType: "string" },
          { name: "active", type: "bool", internalType: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getChatRoom",
    inputs: [{ name: "id", type: "uint256", internalType: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct CommunityBoard.ChatRoom",
        components: [
          { name: "label", type: "string", internalType: "string" },
          { name: "url", type: "string", internalType: "string" },
          { name: "active", type: "bool", internalType: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMessage",
    inputs: [{ name: "id", type: "uint256", internalType: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct CommunityBoard.Message",
        components: [
          { name: "content", type: "string", internalType: "string" },
          { name: "active", type: "bool", internalType: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "membership",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "contract IMembership" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "messageCount",
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
    name: "governanceToken",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "removeChatRoom",
    inputs: [{ name: "id", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "removeMessage",
    inputs: [{ name: "id", type: "uint256", internalType: "uint256" }],
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
    name: "ChatRoomAdded",
    inputs: [
      { name: "id", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "label", type: "string", indexed: false, internalType: "string" },
      { name: "url", type: "string", indexed: false, internalType: "string" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ChatRoomRemoved",
    inputs: [{ name: "id", type: "uint256", indexed: true, internalType: "uint256" }],
    anonymous: false,
  },
  {
    type: "event",
    name: "MessageAdded",
    inputs: [
      { name: "id", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "content", type: "string", indexed: false, internalType: "string" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MessageRemoved",
    inputs: [{ name: "id", type: "uint256", indexed: true, internalType: "uint256" }],
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
    name: "AlreadyRemoved",
    inputs: [{ name: "id", type: "uint256", internalType: "uint256" }],
  },
  { type: "error", name: "EmptyValue", inputs: [] },
  {
    type: "error",
    name: "NotFound",
    inputs: [{ name: "id", type: "uint256", internalType: "uint256" }],
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
  {
    type: "error",
    name: "OwnerNotAMember",
    inputs: [{ name: "owner", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "InvalidGovernanceToken",
    inputs: [{ name: "governanceTokenAddress", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "InvalidMembership",
    inputs: [{ name: "membershipAddress", type: "address", internalType: "address" }],
  },
] as const;
