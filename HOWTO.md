Each customer that registers with dncash-io typically uses one or more of the following APIs:
1. [__Token API__](#Token-API): The Token API provides secure operations invoked by authorized entities such as banking backends or secure personal wallets. A bank may use the Token API to create pre-authorized cash value tokens for registered end-user devices (smartphones) on behalf of their customers that can later be redeemed at a cash point or an ATM.
2. [__Cash API__](#Cash-API): The Cash API is used by secure cash devices such as ATMs and cash registers. It provides methods to verify, lock and confirm cash tokens with the service.
3. [__Mobile API__](#Mobile-API): The Mobile API is used directly by consumer devices to trigger cashout operations at a cash-point.
4. [__Clearing API__](#Clearing-API): The Clearing API provides access to account clearing information to be used for settlement processes.

## Typical usage scenario, step-by-step

### 1. Register new dncash-io customers (e.g. banks, retail stores)

Use the portal app to register new customers such as banks or merchants. Use the APIs page in the portal to create new API credentials for the needed APIs. For instance, for a bank, create Token API credentials. For customers that want to integrate cash devices such as ATMs (banks) or cash registers (merchants), create Cash API credentials.

### 2. Register token devices (end-user smartphones)

When a pre-authorized token is created by the bank on behalf of a bank customer, the secure access code that is needed to redeem the cash token later is encrypted with the public key of a target device so that the cash token can only be redeemed with physical access to the end-user's smartphone. Therefore, each smartphone needs to create a secure public-private key-pair and the public key then needs to be registered with dncash-io. The banking backend typically calls the 'register token device' API endpoint once when a bank user agrees to the Terms and Conditions of the cash service in the banking app or when the bank user uses the cash service for the first time.

Using the bank's Token API credentials, the bank sends the device's public key along with an optional custom reference name (and optional additional data in the info field) as shown below:

    {
      "pubkey": "-----BEGIN RSA PUBLIC KEY-----↵MIIBCgKCAQEA6gsDEQ6Z188fEKzA1xVoQ.....",
      "refname": "Device reference name",
      "info": {
        "anyKey": "anyValue"
      }
    }

The service responds with a new, unique UUID that is used from then on as the device identification and for creating cash tokens for that device:

    {
      "uuid": "256fb6a1-23c6-41b0-8e59-1824d1342d1f"
    }
    
It is recommended to send the registration result back to the smartphone app so that the app may store the device UUID and use it from then on to identify itself.

### 3. Create cash tokens

When the bank customer requests the creation of a new cashin or cashout cash token in his or her app, the banking backend performs the usual authorization and account pre-checks first and then calls dncash-io to create a new cash token. The returned token’s secure code can only be decrypted on the token device holding the corresponding private key. The token server does not store the unencrypted secure code, so that even a compromised database cannot be used by someone else without physical access to the target device. The request body must at least contain the information about the amount, currency symbol, type and the target device_uuid. Optional fields may hold the validity time, denomination data and a custom reference name or ID. The reference name (refname) may typically be used to hold a reference identifying the authorization process - the field refname will also be part of the clearing information later.

    {
      "device_uuid": "916eb12e-4e8a-4833-8e78-be40115829e7",
      "amount": 10000,
      "symbol": "EUR",
      "type": "CASHOUT",
      "expires": 1577829600000,
      "refname": "bookref_08154711",
      "info": {
        "denomData": [
          {
            "d": 5000,
            "c": 2
          }
        ],
        "whatever": "Any value"
      }
    }

The response contains a unique token UUID, a secure_code and, optionally, a plain_code. The plain_code (if configured) is not encrypted and can be used in scenarios where the claiming of a ticket involves a barcode or a manual input process using only a limited number of digits.

    {
      "uuid": "256fb6a1-23c6-41b0-8e59-1824d1342d1f",
      "device_uuid": "c716c0ca-fc93-442b-a295-93f62e6e3a1f",
      "secure_code": "...encrypted code data...",
      "plain_code": "123456"
      "amount": 10000,
      "symbol": "EUR",
      "type": "CASHOUT",
      "state": "OPEN",
      "info": {
        "denomData": [
          {
            "d": 5000,
            "c": 2
          }
        ],
        "whatever": "Any value"
      }
    }

### 4. Display token in banking App

The returned token should be sent back to the target device app and the app may then display the cash token in one of the following ways:

1. Display the token UUID + the decrypted hex encoded secure_code as a QR code to be scanned by an ATM or cash device.
2. Display the plain_code + the decrypted ASCII encoded secure code as a barcode and/or number on the screen to be typed in at a cash point.
3. Display only general token information such as amount and/or ID, creation or expiration date without any barcode or QR code. This can be used in scenarios where the cash device does not scan or receive information from the app, but instead identification data is scanned or received by the smartphone from the cash device using a trigger code. This can be done via a scannable QR-code on the cash device or via NFC.

### 5. Register cash devices (ATMs, cash registers)

Using the Cash API credentials from step 1, cash points and ATMs need to be registered with dncash-io before they can be used. The device registration only needs to be performed once and can either be done by the cash device on its own behalf or initially in a centralized process. Much like the smartphone devices on the Token API, all cash-devices will receive a unique device UUID that they will have to use from then on to communicate with dncash-io through the Cash API. The registration request may hold an optional customer reference name (refname), geo coordinates and additional data in the info field:

    {
      "type": "ATM",
      "lat": 50.043858,
      "lon": 8.679574,
      "refname": "Device reference name, e.g. terminal ID",
      "info": {
        "anyKey": "anyValue"
      }
    }

The refname will be contained in the clearing data later.

    {
      "uuid": "256fb6a1-23c6-41b0-8e59-1824d1342d1f"
    }

The UUID should be stored on the cash device for identification.

### 6. Claim tokens from cash devices

When the bank customer arrives at a cash point, a specific communication process will take place eventually leading to the verification and locking of the cash token presented by the bank customer. dncash-io supports the following three modes of operation for that communication process out-of-the-box:

1. Scanning of the QR code displayed on the smartphone by the ATM/cash point. This mode offers highest security regarding the token verification process (directly performed by the cash device), works in smartphone-offline mode (for instance, with bad mobile network coverage), but is prone to skimming attacks.
2. Scanning a barcode or manually typing in a short plain code (for instance, 6 to 10 digits), for instance by the cashier in a retail store. This mode offers lower token security, but can be used at retail stores equipped with barcode scanners and in manual input scenarios where no other form of automated communication between token device and cash device can be used.
3. Initiating the creation of a random trigger code on the cash machine, either displaying the trigger code as a QR code on the cash machine's screen or preparing it for sending it out via NFC, then scanning or NFC-receiving of that trigger code by the token device (smartphone) and starting the claiming process from the smartphone for the cash token to be pushed onto the cash machine by dncash-io. This mode offers the highest level of security, but it needs mobile network coverage and the process and system architecture involved is a bit more complicated due to the needed pushing mechanism.

In all of the above modes, the claimed cash tokens will be atomically verified and locked. The token's lock will from then on be permanently associated with the cash device and only the cash device that has successfully claimed/locked the token may update/confirm the token.

### 7. Confirm tokens from cash devices

After a token has been successfully claimed by a cash device, the cashout or cashin process is performed and the cash device notifies dncash-io about the result of the cash process. In the confirmation call, the token state can be updated only from state LOCKED to one of COMPLETED (completed normally, amount to be settled/marked for clearing), FAILED (technical failure), CANCELED (operation canceled by the user), REJECTED (process rejected or aborted by the system), RETRACTED (dispensed money retracted). Also, the field lockrefname can be updated, for instance to hold a custom cash-side transaction reference (will be part of the clearing information later). In addition, the amount can be updated to the actual deposit or dispense amount (optional). Furthermore, you may optionally specify arbitrary JSON data to update the token's processing_info field for journalization.

### 8. Live token update on Token API

Whenever a token state changes, the bank is notified via the Token APIs live websocket endpoint so that it can immediately perform the necessary actions. Typically, if a token state changes to COMPLETED, the bank may send out a push notification through the mobile provider's cloud messaging services to the banking app so that the bank customer is immediately notified about successful cash processing. When a token goes into a failed state such as REJECTED, CANCELED etc., the bank may immediately reverse the pre-authorization on the customer's account.

### 9. Token batch reversals

Instead of acting only on the live token update notifications (which may be incomplete during networking problems), the bank will also have to apply a token cleanup batch process on the Token API (for instance, once a day) that scans all tokens for failed, expired or completed tokens and processes those tokens accordingly.

### 10. Clearing

In an intra-bank/single customer scenario, the processes in step 8 and 9 may be sufficient to resolve all internal clearing processes. In a multi-customer scenario, however, detailed clearing information for cross-customer clearing needs to be available to be processed by all involved parties. For that purpose, the clearing API offers all the necessary clearing data:

    [
      {
        "date": "2018-04-16T08:07:03.000Z",
        "uuid": "916eb12e-4e8a-4833-8e78-be40115829e7",
        "type": "CASHOUT",
        "tokendevice": "custommobile123",
        "refname": "bookref_08154711",
        "lockdevice": "ATM-0001",
        "lockrefname": "cashtsa_000173",
        "amount": 10000,
        "symbol": "EUR",
        "debitor": {
          "name": "Issuer Bank AG",
          "iban": "DE1001100152389572932"
        },
        "creditor": {
          "name": "Retailer Bank Ltd.",
          "iban": "DE5005005012345678901"
        }
      }
    ]
