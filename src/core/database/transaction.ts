export async function inTransaction<T>(pool:any, work:(client:any)=>Promise<T>):Promise<T>{
  const client=await pool.connect();
  try{ await client.query('BEGIN'); const result=await work(client); await client.query('COMMIT'); return result; }
  catch(error){ try{await client.query('ROLLBACK')}catch{} throw error; }
  finally{ client.release(); }
}
