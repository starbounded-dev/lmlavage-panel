import { ExcelImporter } from "@/components/excel-importer";
import { PageHeader } from "@/components/page-header";

export default function ExcelImportPage() {
  return <><PageHeader title="Importer le fichier Excel" description="Vérifiez les données avant de les intégrer au panneau LM." /><ExcelImporter /></>;
}
