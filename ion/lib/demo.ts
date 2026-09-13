import { query } from "./db";

export async function getJobBoardOpen(): Promise<boolean> {
  const rows = await query<{ value: boolean }>(
    "select value from demo_state where key = $1",
    ["job_board_open"],
  );
  return rows.length > 0 ? rows[0].value : false;
}

export async function setJobBoardOpen(open: boolean): Promise<void> {
  await query(
    "update demo_state set value = $1, updated_at = now() where key = $2",
    [open, "job_board_open"],
  );
}
