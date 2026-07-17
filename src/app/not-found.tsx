import { ButtonLink } from "@/components/ui/button";

export default function NotFound(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-[var(--color-muted-foreground)]">
        The project or scenario you requested does not exist.
      </p>
      <ButtonLink href="/" className="mt-6">
        Back to projects
      </ButtonLink>
    </div>
  );
}
