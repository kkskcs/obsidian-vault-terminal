export class TemplateEngine {
  render(template: string, params: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (_, key: string) => params[key] ?? `{${key}}`);
  }
}
