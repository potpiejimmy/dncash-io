import * as crypto from "crypto";
import * as base32 from 'base32';
import { changeNotifier } from "../util/notifier";
import * as Param from './param';

// TODO: keep auths out of memory in the future
let auths = {};

function getAuthsForCustomer(customer: any) {
    let a = auths[customer.id];
    if (!a) auths[customer.id] = a = {};
    return a;
}

export async function createAuth(customer: any, device_uuid: string, cardData: any): Promise<any> {
    let nonce = base32.encode(crypto.randomBytes(40));
    cardData.created = Date.now();
    cardData.nonce = nonce;
    cardData.device_uuid = device_uuid;
    getAuthsForCustomer(customer)[nonce] = cardData;
    changeNotifier.notifyObservers("cardauth:"+customer.id, {});

    let testcardmapping = await Param.readParam(customer.id, "testcardmapping");
    if (testcardmapping && cardData.t2.match(testcardmapping.regex)) {
        cardData.url = testcardmapping.url;
    }
    return cardData;
}

export async function getAuths(customer: any): Promise<any> {
    let au = getAuthsForCustomer(customer);
    return Object.keys(au).map(k => au[k]).sort((a,b) => (a.created-b.created));
}

export async function deleteAuth(customer: any, nonce: string): Promise<void> {
    delete getAuthsForCustomer(customer)[nonce];
    changeNotifier.notifyObservers("cardauth:"+customer.id, {});
}
