/**
 * Gerador de BR Code (Pix Copia e Cola) no padrão EMV do Banco Central.
 * Função pura — pode rodar no servidor ou no navegador.
 */

function tlv(id: string, value: string) {
  const size = value.length.toString().padStart(2, "0");
  return `${id}${size}${value}`;
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function sanitize(input: string, max: number) {
  return (input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 $%*+\-./:]/g, "")
    .trim()
    .slice(0, max)
    .toUpperCase();
}

export function buildPixPayload(input: {
  key: string;
  receiverName: string;
  receiverCity: string;
  amount: number;
  description?: string;
  txid?: string;
}) {
  const merchantAccount = tlv("00", "br.gov.bcb.pix") + tlv("01", input.key.trim());

  const txid = sanitize(input.txid ?? "***", 25) || "***";

  const payload =
    tlv("00", "01") +
    tlv("26", merchantAccount) +
    tlv("52", "0000") +
    tlv("53", "986") +
    tlv("54", input.amount.toFixed(2)) +
    tlv("58", "BR") +
    tlv("59", sanitize(input.receiverName, 25) || "RECEBEDOR") +
    tlv("60", sanitize(input.receiverCity, 15) || "SAO PAULO") +
    tlv("62", tlv("05", txid)) +
    "6304";

  return payload + crc16(payload);
}
