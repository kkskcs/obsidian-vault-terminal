export class Executor {
  constructor(private readonly send: (text: string) => void) {}

  sendText(text: string): void {
    this.send(text);
  }
}
