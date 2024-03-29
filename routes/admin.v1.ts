import { Router, Request, Response, NextFunction } from "express";
import * as Access from "../business/access";
import * as Device from "../business/device";
import * as Account from "../business/account";
import * as Token from "../business/token";
import * as Journal from "../business/journal";
import * as Param from "../business/param";
import * as Login from "../business/login";
import * as XCard from "../business/xcard";

export const routerAdminV1: Router = Router();

// ------ two-factor auth ---------------

/*
 * Starts initialization for 2FA for the currently authenticated user
 */
routerAdminV1.get("/auth/twofa", function (request: Request, response: Response, next: NextFunction) {
    Login.initialize2FA(request.user)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/*
 * Enables 2FA for the currently authenticated user if initial token is correct
 */
routerAdminV1.post("/auth/twofa", function (request: Request, response: Response, next: NextFunction) {
    Login.enable2FA(request.user, request.body.token)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/*
 * Disables 2FA for the currently authenticated user
 */
routerAdminV1.delete("/auth/twofa", function (request: Request, response: Response, next: NextFunction) {
    Login.disable2FA(request.user)
    .then(res => response.json(res))
    .catch(err => next(err));
});

// ------ customer ------------------------

/*
 * Changes the password for the authenticated user
 */
routerAdminV1.put("/auth/changepw", function (request: Request, response: Response, next: NextFunction) {
    Login.changePassword(request.user, request.body.oldPassword, request.body.newPassword)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/*
 * Create a new customer (superuser only)
 */
routerAdminV1.post("/auth/create", function (request: Request, response: Response, next: NextFunction) {
    Login.registerOther(request.user, request.body.email)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/*
 * Get all customers (admin only)
 */
routerAdminV1.get("/customers",  function (request: Request, response: Response, next: NextFunction) {
    Login.getAllUsers(request.user)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/*
 * Deletes a customer (admin only)
 */
routerAdminV1.delete("/customers/:email",  function (request: Request, response: Response, next: NextFunction) {
    Login.deleteUser(request.user, request.params.email)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/*
 * Deletes a customer's 2FA token / reset 2 FA (admin only)
 */
routerAdminV1.delete("/customers/:email/twofa",  function (request: Request, response: Response, next: NextFunction) {
    Login.reset2FAForUser(request.user, request.params.email)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/*
 * Updates/saves a customer (admin only)
 */
routerAdminV1.put("/customers/:email",  function (request: Request, response: Response, next: NextFunction) {
    Login.updateUser(request.user, request.params.email, request.body)
    .then(res => response.json(res))
    .catch(err => next(err));
});

// ------ access ------------------------

/*
 * Create and returns new API access key (without secret)
 */
routerAdminV1.post("/access", function (request: Request, response: Response, next: NextFunction) {
    Access.createApiKey(request.user, request.body.scope)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/*
 * Returns all API keys for the authenticated user (does not include secret)
 */
routerAdminV1.get("/access", function (request: Request, response: Response, next: NextFunction) {
    Access.findByCustomerAndScope(request.user, request.query.scope)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/*
 * Returns API secret for given ID and customer, secure with password.
 */
routerAdminV1.put("/access/:id", function (request: Request, response: Response, next: NextFunction) {
    Access.findByCustomerAndId(request.user, request.body.password, request.params.id)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/*
 * Delete given API key the authenticated user
 */
routerAdminV1.delete("/access/:id", function (request: Request, response: Response, next: NextFunction) {
    Access.deleteByCustomerAndId(request.user, request.params.id)
    .then(res => response.json(res))
    .catch(err => next(err));
});

// ------ devices ------------------------

/*
 * Returns all devices for the authenticated user
 */
routerAdminV1.get("/devices", function (request: Request, response: Response, next: NextFunction) {
    Device.findByCustomer(request.user)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/*
 * Deletes the given device for the authenticated user
 */
routerAdminV1.delete("/devices/:id", function (request: Request, response: Response, next: NextFunction) {
    Device.deleteByCustomerAndId(request.user, request.params.id)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/*
 * Updates fields of the given device
 */
routerAdminV1.put("/devices/:id", function (request: Request, response: Response, next: NextFunction) {
    Device.updateDeviceByCustomerAndId(request.user, request.params.id, request.body)
    .then(res => response.json(res))
    .catch(err => next(err));
});

// ------ accounts ------------------------

/*
 * Creates a new account for the authenticated user
 */
routerAdminV1.post("/accounts", function (request: Request, response: Response, next: NextFunction) {
    Account.create(request.user, request.body)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/*
 * Returns all accounts for the authenticated user
 */
routerAdminV1.get("/accounts", function (request: Request, response: Response, next: NextFunction) {
    Account.findByCustomer(request.user, request.query)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/*
 * gets a customer account by account id
 */
routerAdminV1.get("/accounts/:id", function (request: Request, response: Response, next: NextFunction) {
    Account.findById(request.params.id)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/*
 * Deletes the given account for the authenticated user
 */
routerAdminV1.delete("/accounts/:id", function (request: Request, response: Response, next: NextFunction) {
    Account.deleteAccount(request.user, request.params.id)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/*
 *updates a customer account by account id
 */
routerAdminV1.put("/accounts/:id", function (request: Request, response: Response, next: NextFunction) {
    Account.updateAccount(request.user, request.params.id, request.body)
    .then(res => response.json(res))
    .catch(err => next(err));
});


// ------- statistics ---------------

/*
 * Returns token statistics for the authenticated user
 */
routerAdminV1.get("/tokenstat", function (request: Request, response: Response, next: NextFunction) {
    Token.getStatistics(request.user)
    .then(res => response.json(res))
    .catch(err => next(err));
});

// ------- journal ---------------

/*
 * Returns journal for the authenticated user
 */
routerAdminV1.get("/journal", function (request: Request, response: Response, next: NextFunction) {
    Journal.getJournal(request.user, request.query.limit, request.query.from, request.query.to, request.query.filter)
    .then(res => response.json(res))
    .catch(err => next(err));
});

// ------- customer params ---------------

/**
 * Gets a parameter for the authenticated user
 */
routerAdminV1.get("/params/:pkey", function (request: Request, response: Response, next: NextFunction) {
    Param.readParam(request.user.id, request.params.pkey)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/**
 * Sets a parameter for the authenticated user
 */
routerAdminV1.put("/params/:pkey", function (request: Request, response: Response, next: NextFunction) {
    Param.writeParam(request.user.id, request.params.pkey, request.body)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/**
 * Deletes a parameter for the authenticated user
 */
routerAdminV1.delete("/params/:pkey", function (request: Request, response: Response, next: NextFunction) {
    Param.removeParam(request.user.id, request.params.pkey)
    .then(res => response.json(res))
    .catch(err => next(err));
});

// ------- card auth ---------------

/**
 * Gets current card authorizations
 */
routerAdminV1.get("/xcard/auth", function (request: Request, response: Response, next: NextFunction) {
    XCard.getAuths(request.user)
    .then(res => response.json(res))
    .catch(err => next(err));
});

/**
 * Remove a card authorization
 */
routerAdminV1.delete("/xcard/auth/:nonce", function (request: Request, response: Response, next: NextFunction) {
    XCard.deleteAuth(request.user, request.params.nonce)
    .then(res =>  response.status(204).send())
    .catch(err => next(err));
});

// ------- system admin only (role admin) ---------------

routerAdminV1.get("/admin/devicestat", function (request: Request, response: Response, next: NextFunction) {
    Device.getAdminDeviceStatistics(request.user)
    .then(res => response.json(res))
    .catch(err => next(err));
});

routerAdminV1.get("/admin/journal", function (request: Request, response: Response, next: NextFunction) {
    Journal.getAdminJournal(request.user)
    .then(res => response.json(res))
    .catch(err => next(err));
});
