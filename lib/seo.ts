import type { Metadata } from "next";

export const SITE_ORIGIN = "https://www.surfsats.com";
export const OG_HOME = "/og-home.png";
export const OG_HOME_SIZE = { width: 1200, height: 630 } as const;

export function canonicalUrl(path: string) {
  if (path === "/" || path === "") return `${SITE_ORIGIN}/`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_ORIGIN}${normalized}`;
}

export function pageMeta({
  title,
  description,
  path,
  image = OG_HOME,
  robots,
  absoluteTitle = false,
  type = "website",
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  robots?: Metadata["robots"];
  absoluteTitle?: boolean;
  type?: "website" | "article";
}): Metadata {
  const url = canonicalUrl(path);
  const imageUrl = image.startsWith("http") ? image : `${SITE_ORIGIN}${image}`;
  const documentTitle = absoluteTitle ? title : `${title} · SurfSats`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    robots,
    openGraph: {
      title: documentTitle,
      description,
      url,
      siteName: "SurfSats",
      type,
      images: [
        {
          url: imageUrl,
          width: OG_HOME_SIZE.width,
          height: OG_HOME_SIZE.height,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: documentTitle,
      description,
      images: [imageUrl],
    },
  };
}
