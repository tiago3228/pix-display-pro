import { ExternalLink } from "lucide-react";

type PublicSection = { key: string; sortOrder: number; content: unknown };
type PublicRecord = Record<string, unknown>;

function record(value: unknown): PublicRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as PublicRecord)
    : null;
}

function items(content: PublicRecord): PublicRecord[] {
  const value = content["items"];
  if (!Array.isArray(value)) return [];
  return value.map(record).filter((entry): entry is PublicRecord => entry !== null);
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function PublicPremiumSections({
  sections,
  primaryColor,
}: {
  sections: PublicSection[];
  primaryColor: string;
}) {
  return (
    <div className="mx-auto mt-5 max-w-6xl space-y-5 px-4">
      {[...sections]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((section) => {
          const content = record(section.content);
          if (!content) return null;

          if (section.key === "intro") {
            const image = text(content["image"]);
            return (
              <section
                key={section.key}
                className="surface grid gap-4 overflow-hidden p-5 sm:grid-cols-2 sm:items-center"
              >
                <div>
                  <h2 className="text-xl font-bold" style={{ color: primaryColor }}>
                    {text(content["title"])}
                  </h2>
                  <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                    {text(content["description"])}
                  </p>
                </div>
                {image ? (
                  <img
                    src={image}
                    alt={text(content["imageAlt"])}
                    loading="lazy"
                    className="max-h-72 w-full rounded-xl object-cover"
                  />
                ) : null}
              </section>
            );
          }

          if (section.key === "differentiators" || section.key === "service_steps") {
            const entries = items(content);
            if (!entries.length) return null;
            return (
              <section key={section.key}>
                <h2 className="mb-3 text-lg font-bold" style={{ color: primaryColor }}>
                  {section.key === "differentiators"
                    ? "Por que escolher esta loja"
                    : "Como funciona"}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {entries.map((entry, index) => (
                    <article key={text(entry["id"]) || index} className="surface p-4">
                      <h3 className="font-semibold">{text(entry["title"])}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {text(entry["description"])}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            );
          }

          if (section.key === "portfolio") {
            const entries = items(content);
            if (!entries.length) return null;
            return (
              <section key={section.key}>
                <h2 className="mb-3 text-lg font-bold" style={{ color: primaryColor }}>
                  Projetos e portfólio
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {entries.map((entry, index) => {
                    const image = text(entry["image"]);
                    const href = text(entry["href"]);
                    const body = (
                      <>
                        {image ? (
                          <img
                            src={image}
                            alt={text(entry["imageAlt"])}
                            loading="lazy"
                            className="aspect-[16/10] w-full object-cover"
                          />
                        ) : null}
                        <div className="p-4">
                          <h3 className="font-semibold">{text(entry["title"])}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {text(entry["description"])}
                          </p>
                          {href ? (
                            <span
                              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold"
                              style={{ color: primaryColor }}
                            >
                              Conhecer projeto <ExternalLink className="size-4" />
                            </span>
                          ) : null}
                        </div>
                      </>
                    );
                    return href ? (
                      <a
                        key={text(entry["id"]) || index}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="surface overflow-hidden transition hover:-translate-y-0.5"
                      >
                        {body}
                      </a>
                    ) : (
                      <article key={text(entry["id"]) || index} className="surface overflow-hidden">
                        {body}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          }

          if (section.key === "faq") {
            const entries = items(content);
            if (!entries.length) return null;
            return (
              <section key={section.key}>
                <h2 className="mb-3 text-lg font-bold" style={{ color: primaryColor }}>
                  Perguntas frequentes
                </h2>
                <div className="space-y-2">
                  {entries.map((entry, index) => (
                    <details key={text(entry["id"]) || index} className="surface p-4">
                      <summary className="cursor-pointer font-semibold">
                        {text(entry["question"])}
                      </summary>
                      <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                        {text(entry["answer"])}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            );
          }

          if (section.key === "testimonials") {
            const entries = items(content);
            if (!entries.length) return null;
            return (
              <section key={section.key}>
                <h2 className="mb-3 text-lg font-bold" style={{ color: primaryColor }}>
                  Depoimentos autorizados
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {entries.map((entry, index) => (
                    <figure key={text(entry["id"]) || index} className="surface p-4">
                      {text(entry["image"]) ? (
                        <img
                          src={text(entry["image"])}
                          alt={text(entry["imageAlt"])}
                          loading="lazy"
                          className="mb-3 size-14 rounded-full object-cover"
                        />
                      ) : null}
                      <blockquote className="text-sm">“{text(entry["quote"])}”</blockquote>
                      <figcaption className="mt-3 text-xs font-semibold text-muted-foreground">
                        {text(entry["displayName"])}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            );
          }

          return null;
        })}
    </div>
  );
}
