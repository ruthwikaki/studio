import FileUploader from "@/components/data-import/FileUploader";

export default function DataImportPage() {
  return (
    <div className="container mx-auto py-8">
      <FileUploader />
      {/* Future: Add section for import history or validation results */}
    </div>
  );
}
