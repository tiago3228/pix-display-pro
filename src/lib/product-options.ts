export type ProductOption = { name: string };

export function missingOptionsMessage(
  options: ProductOption[],
  choices: Record<string, string>,
): string | null {
  const missing = options
    .filter((option) => !choices[option.name])
    .map((option) =>
      option.name.trim().replace(/^./u, (letter) => letter.toLocaleLowerCase("pt-BR")),
    );
  if (missing.length === 0) return null;

  const names =
    missing.length < 2
      ? (missing[0] ?? "")
      : `${missing.slice(0, -1).join(", ")} e ${missing[missing.length - 1]}`;

  return missing.length === 1
    ? `Selecione uma opção de ${names} antes de adicionar o produto ao carrinho.`
    : `Selecione as opções de ${names} antes de adicionar o produto ao carrinho.`;
}
