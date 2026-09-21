import {user,stateFor,response,fail} from '@/lib/server';
export async function GET(req:Request){try{return response(await stateFor(await user(req)))}catch(e){return fail(e)}}
