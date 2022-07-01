import fetch, { RequestInfo, RequestInit, Response } from 'node-fetch';
import { FetchError } from './fetch-error';

/**
 * Asynchronous external api call with mapped error body
 */
export async function callApi(uri: RequestInfo, options: RequestInit = {}) {
    try {
        return  await loadData(uri, options);
    } catch (error: unknown) {
        const errorBody = error as { body: unknown, status: number };
        throw new FetchError(error as Error, errorBody.status, errorBody.body);
    }
}

/**
 * Calls FETCH API and expects Text or JSON response
 */
async function loadData(uri: RequestInfo, options: RequestInit = {}) {
    let response = await fetch(uri, options);
    const contentType = response.headers.get("content-type");
    // TODO: Add handlers for other response types (blobs, etc)
    if (response.status >= 200 && response.status < 300) { 
        if (contentType && contentType.includes('application/json')) {
            return response.json();
        } else {
            return response.text();
        }
    }   
    return getErrorBody(response, contentType)
        .then(body=>{
            return Promise.reject({ body, status: response.status })
        })
}

async function getErrorBody(response: Response, contentType: string | null) {
    if (contentType?.includes('application/json')) {
        return await response.json();
    } 
    return await response.text();
}
