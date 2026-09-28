
export class ErroNegocio extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroNegocio';
  }
}

export class ErroNaoEncontrado extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroNaoEncontrado';
  }
}
