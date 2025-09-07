use solana_program::{
      account_info::AccountInfo,
      entrypoint,
      entrypoint::ProgramResult,
      msg,
      pubkey::Pubkey,
  };

  entrypoint!(process_instruction);

  pub fn process_instruction(
      program_id: &Pubkey,
      _accounts: &[AccountInfo],
      instruction_data: &[u8],
  ) -> ProgramResult {
      msg!("Simple Coin Flipper - Program ID: {}", program_id);

      let flip_result = if instruction_data.is_empty() || instruction_data[0] % 2 == 0 {
          "HEADS"
      } else {
          "TAILS"
      };

      msg!("Coin flip result: {}", flip_result);
      Ok(())
  }
