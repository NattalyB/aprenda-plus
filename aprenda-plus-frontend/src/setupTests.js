// Adiciona verificações extras para elementos da tela, como:
// expect(elemento).toBeInTheDocument()
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// O React Router usa TextEncoder, que o "navegador de mentira" do Jest (jsdom) não tem.
// Aqui pegamos emprestado o do Node.
Object.assign(globalThis, { TextEncoder, TextDecoder });
