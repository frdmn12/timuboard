import { ServiceUnavailableException } from '@nestjs/common';
import { GoogleTokenVerifier } from './google-token.verifier';

describe('GoogleTokenVerifier', () => {
  it('menjawab 503 GOOGLE_NOT_CONFIGURED bila GOOGLE_CLIENT_ID kosong', async () => {
    const verifier = new GoogleTokenVerifier({ get: () => undefined } as never);
    await expect(verifier.verify('x')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('menjawab INVALID_GOOGLE_TOKEN untuk token sembarang', async () => {
    const verifier = new GoogleTokenVerifier({ get: () => 'cid' } as never);
    await expect(verifier.verify('bukan-jwt')).rejects.toMatchObject({
      response: { code: 'INVALID_GOOGLE_TOKEN' },
    });
  });
});
