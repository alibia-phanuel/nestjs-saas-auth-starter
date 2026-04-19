// Mock de qrcode pour les tests
export const toDataURL = jest.fn(
  (): Promise<string> => Promise.resolve('data:image/png;base64,MOCK_QR_CODE'),
);
