import type { Metadata } from "next";
import { PaperclipIcon } from "lucide-react";
import { ExpenseActions } from "@/components/expense-actions";
import { NewExpenseDialog } from "@/components/operation-dialogs";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCad, formatDate } from "@/lib/format";
import { getAppData } from "@/lib/repository";

export const metadata: Metadata = { title: "Dépenses" };

export default async function ExpensesPage() {
  const data = await getAppData();
  const total = data.expenses.reduce((sum, expense) => sum + expense.total, 0);
  return (
    <>
      <PageHeader title="Dépenses" description="Dépenses d’entreprise, taxes et reçus justificatifs." action={<NewExpenseDialog jobs={data.jobs} business={data.business} />} />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card><CardHeader><CardDescription>Total dépensé</CardDescription><CardTitle className="metric-number text-2xl">{formatCad(total)}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Écritures</CardDescription><CardTitle className="metric-number text-2xl">{data.expenses.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Reçus à joindre</CardDescription><CardTitle className="metric-number text-2xl">{data.expenses.filter((expense) => !expense.receiptPath).length}</CardTitle></CardHeader></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Grand livre</CardTitle><CardDescription>Les montants importés correspondent au classeur initial.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Fournisseur</TableHead><TableHead>Catégorie</TableHead><TableHead>Reçu</TableHead><TableHead className="text-right">Sous-total</TableHead><TableHead className="text-right">Taxes</TableHead><TableHead className="text-right">Total</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
            <TableBody>
              {data.expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{formatDate(expense.date)}</TableCell><TableCell className="font-medium">{expense.vendor}</TableCell><TableCell><Badge variant="secondary">{expense.category}</Badge></TableCell>
                  <TableCell>{expense.receiptPath ? <PaperclipIcon className="size-4 text-primary" /> : <span className="text-xs text-muted-foreground">Absent</span>}</TableCell>
                  <TableCell className="text-right font-mono">{formatCad(expense.subtotal)}</TableCell><TableCell className="text-right font-mono">{formatCad(expense.gstAmount + expense.qstAmount)}</TableCell><TableCell className="text-right font-mono font-medium">{formatCad(expense.total)}</TableCell>
                  <TableCell><ExpenseActions expense={expense} jobs={data.jobs} business={data.business} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
