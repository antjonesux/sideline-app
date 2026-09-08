import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/import", destination: "/film/new", permanent: true },
      // Public playbooks SEO migration — evergreen `/playbooks/college-football`
      { source: "/playbooks", destination: "/playbooks/college-football", permanent: true },
      { source: "/playbooks/", destination: "/playbooks/college-football", permanent: true },
      {
        source: "/playbooks/:playbookId((?!college-football)[^/]+)",
        destination: "/playbooks/college-football/:playbookId",
        permanent: true,
      },
      {
        source: "/playbooks/:playbookId((?!college-football)[^/]+)/:formationId",
        destination: "/playbooks/college-football/:playbookId/:formationId",
        permanent: true,
      },
      {
        source: "/playbooks/:playbookId((?!college-football)[^/]+)/:formationId/:playId",
        destination: "/playbooks/college-football/:playbookId/:formationId/:playId",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
