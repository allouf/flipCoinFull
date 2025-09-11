@allouf ➜ /workspaces/flipCoin (main) $ cat target/idl/coin_flipper.json
{
  "version": "0.1.0",
  "name": "coin_flipper",
  "instructions": [
    {
      "name": "initialize",
      "docs": [
        "Initialize the program with house wallet and fee configuration"
      ],
      "accounts": [
        {
          "name": "globalState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "houseWallet",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "houseFeeBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "createRoom",
      "docs": [
        "Create a new game room with specified bet amount and escrow funds"
      ],
      "accounts": [
        {
          "name": "gameRoom",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "escrowAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "roomId",
          "type": "u64"
        },
        {
          "name": "betAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "joinRoom",
      "docs": [
        "Join an existing game room and escrow matching funds"
      ],
      "accounts": [
        {
          "name": "gameRoom",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "escrowAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "joiner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "makeSelection",
      "docs": [
        "Make heads or tails selection"
      ],
      "accounts": [
        {
          "name": "gameRoom",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "player",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "selection",
          "type": {
            "defined": "CoinSide"
          }
        }
      ]
    },
    {
      "name": "resolveGame",
      "docs": [
        "Resolve game and distribute payouts"
      ],
      "accounts": [
        {
          "name": "gameRoom",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "globalState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "escrowAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "player1",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "player2",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "houseWallet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "resolver",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "handleTimeout",
      "docs": [
        "Handle timeout scenarios - refund players if game doesn't complete"
      ],
      "accounts": [
        {
          "name": "gameRoom",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "escrowAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "player1",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "player2",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "pauseProgram",
      "docs": [
        "Emergency pause function (only authority can call)"
      ],
      "accounts": [
        {
          "name": "globalState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": []
    },
    {
      "name": "unpauseProgram",
      "docs": [
        "Emergency unpause function (only authority can call)"
      ],
      "accounts": [
        {
          "name": "globalState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "GlobalState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "houseWallet",
            "type": "publicKey"
          },
          {
            "name": "houseFeeBps",
            "type": "u16"
          },
          {
            "name": "totalGames",
            "type": "u64"
          },
          {
            "name": "totalVolume",
            "type": "u64"
          },
          {
            "name": "isPaused",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "GameRoom",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "roomId",
            "type": "u64"
          },
          {
            "name": "creator",
            "type": "publicKey"
          },
          {
            "name": "player1",
            "type": "publicKey"
          },
          {
            "name": "player2",
            "type": "publicKey"
          },
          {
            "name": "betAmount",
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": "RoomStatus"
            }
          },
          {
            "name": "player1Selection",
            "type": {
              "option": {
                "defined": "CoinSide"
              }
            }
          },
          {
            "name": "player2Selection",
            "type": {
              "option": {
                "defined": "CoinSide"
              }
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "selectionDeadline",
            "type": "i64"
          },
          {
            "name": "vrfResult",
            "type": {
              "option": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          },
          {
            "name": "vrfStatus",
            "type": {
              "defined": "VrfStatus"
            }
          },
          {
            "name": "winner",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "totalPot",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "escrowBump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "RoomStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "WaitingForPlayer"
          },
          {
            "name": "SelectionsPending"
          },
          {
            "name": "Resolving"
          },
          {
            "name": "Completed"
          },
          {
            "name": "Cancelled"
          }
        ]
      }
    },
    {
      "name": "CoinSide",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Heads"
          },
          {
            "name": "Tails"
          }
        ]
      }
    },
    {
      "name": "VrfStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "None"
          },
          {
            "name": "Pending"
          },
          {
            "name": "Fulfilled"
          },
          {
            "name": "Failed"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidHouseFee",
      "msg": "House fee cannot exceed 10%"
    },
    {
      "code": 6001,
      "name": "BetTooSmall",
      "msg": "Bet amount is below minimum"
    },
    {
      "code": 6002,
      "name": "RoomNotAvailable",
      "msg": "Room is not available for joining"
    },
    {
      "code": 6003,
      "name": "CannotJoinOwnRoom",
      "msg": "Cannot join your own room"
    },
    {
      "code": 6004,
      "name": "InvalidRoomStatus",
      "msg": "Invalid room status for this operation"
    },
    {
      "code": 6005,
      "name": "SelectionTimeout",
      "msg": "Selection timeout exceeded"
    },
    {
      "code": 6006,
      "name": "AlreadySelected",
      "msg": "Player has already made a selection"
    },
    {
      "code": 6007,
      "name": "NotInRoom",
      "msg": "Player is not in this room"
    },
    {
      "code": 6008,
      "name": "InvalidGameState",
      "msg": "Invalid game state"
    },
    {
      "code": 6009,
      "name": "MissingSelections",
      "msg": "Missing player selections"
    },
    {
      "code": 6010,
      "name": "InvalidTimeoutCondition",
      "msg": "Invalid timeout condition"
    },
    {
      "code": 6011,
      "name": "Unauthorized",
      "msg": "Unauthorized access"
    },
    {
      "code": 6012,
      "name": "InvalidHouseWallet",
      "msg": "Invalid house wallet"
    },
    {
      "code": 6013,
      "name": "InsufficientEscrowBalance",
      "msg": "Insufficient escrow balance"
    },
    {
      "code": 6014,
      "name": "ProgramPaused",
      "msg": "Program is paused"
    }
  ]
}@allouf ➜ /workspaces/flipCoin (main) $ 