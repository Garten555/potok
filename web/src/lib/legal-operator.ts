/** Публичные реквизиты оператора для юридических страниц (NEXT_PUBLIC_* — подставляются при сборке). */
export type LegalOperator = {
  name: string | null;
  inn: string | null;
  ogrn: string | null;
  address: string | null;
  email: string | null;
};

export function getLegalOperator(): LegalOperator {
  return {
    name: process.env.NEXT_PUBLIC_OPERATOR_NAME?.trim() || null,
    inn: process.env.NEXT_PUBLIC_OPERATOR_INN?.trim() || null,
    ogrn: process.env.NEXT_PUBLIC_OPERATOR_OGRN?.trim() || null,
    address: process.env.NEXT_PUBLIC_OPERATOR_ADDRESS?.trim() || null,
    email: process.env.NEXT_PUBLIC_OPERATOR_EMAIL?.trim() || null,
  };
}

export function operatorConfigured(o: LegalOperator): boolean {
  return Boolean(o.name && o.email);
}
