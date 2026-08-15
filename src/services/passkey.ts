import { api } from './api';

// Utility to convert Base64/string to Uint8Array for WebAuthn APIs
function bufferFromBase64(base64: string): Uint8Array {
  const binary = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const passkeyService = {
  isSupported(): boolean {
    return typeof window !== 'undefined' && 
      !!window.PublicKeyCredential && 
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';
  },

  async registerPasskey(): Promise<{ success: boolean; message: string }> {
    if (!this.isSupported()) {
      throw new Error('Passkeys are not supported on this browser or device.');
    }

    // 1. Get options from backend
    const optionsRes = await api.getPasskeyRegisterOptions();
    const options = optionsRes.options;

    // 2. Prepare WebAuthn publicKey options
    const publicKeyOptions: PublicKeyCredentialCreationOptions = {
      challenge: bufferFromBase64(btoa(options.challenge)) as any,
      rp: { name: options.rp.name },
      user: {
        id: bufferFromBase64(btoa(options.user.id)) as any,
        name: options.user.name,
        displayName: options.user.displayName
      },
      pubKeyCredParams: options.pubKeyCredParams,
      authenticatorSelection: options.authenticatorSelection,
      timeout: options.timeout
    };

    // 3. Trigger native browser WebAuthn prompt
    const credential = (await navigator.credentials.create({
      publicKey: publicKeyOptions
    })) as PublicKeyCredential;

    if (!credential) {
      throw new Error('Passkey creation cancelled or failed.');
    }

    const rawId = bufferToBase64(credential.rawId);
    const pubKeyDummy = `pubkey_${rawId.slice(0, 16)}`;

    // 4. Verify credential with backend
    await api.verifyPasskeyRegistration({
      challenge: options.challenge,
      credential_id: credential.id || rawId,
      public_key: pubKeyDummy,
      name: options.user.displayName + ' (Passkey)'
    });

    return { success: true, message: 'Passkey registered successfully!' };
  },

  async loginWithPasskey(): Promise<any> {
    if (!this.isSupported()) {
      throw new Error('Passkeys are not supported on this browser or device.');
    }

    // 1. Get login challenge options
    const optionsRes = await api.getPasskeyLoginOptions();
    const options = optionsRes.options;

    // 2. Prepare WebAuthn publicKey request options
    const publicKeyOptions: PublicKeyCredentialRequestOptions = {
      challenge: bufferFromBase64(btoa(options.challenge)) as any,
      timeout: options.timeout,
      userVerification: options.userVerification
    };

    // 3. Trigger native browser assertion prompt
    const credential = (await navigator.credentials.get({
      publicKey: publicKeyOptions
    })) as PublicKeyCredential;

    if (!credential) {
      throw new Error('Passkey verification cancelled.');
    }

    const rawId = bufferToBase64(credential.rawId);

    // 4. Verify assertion with backend and retrieve tokens
    return await api.verifyPasskeyLogin({
      challenge: options.challenge,
      credential_id: credential.id || rawId
    });
  }
};
