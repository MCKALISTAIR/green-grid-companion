import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

/** One owner for page identity, including direct entry and client navigation. */
export function RouteMetadata() {
  const { pathname } = useLocation();
  const pageUrl = new URL(pathname, 'https://getgridsense.com').href;

  return (
    <Helmet>
      <link rel="canonical" href={pageUrl} />
      <meta property="og:url" content={pageUrl} />
    </Helmet>
  );
}