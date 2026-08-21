// app/vendor/products/bulk-upload/page.tsx
"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { ArrowLeft, Download, Upload, Loader2, CheckCircle2, XCircle } from "lucide-react";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB, mirrors the server-side cap

interface BulkUploadResult {
  totalRows: number;
  successCount: number;
  failedCount: number;
  failures: { row: number; error: string }[];
  createdProductIds: string[];
}

export default function BulkUploadProductsPage() {
  const t = useTranslations("VendorBulkUpload");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BulkUploadResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setResult(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error(t("selectCsvFileError"));
      e.target.value = "";
      setSelectedFile(null);
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(t("fileTooLargeError"));
      e.target.value = "";
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error(t("chooseFileFirstError"));
      return;
    }
    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/vendor/products/bulk-upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setResult(data);
        if (data.successCount > 0) {
          toast.success(t("toastSuccessCount", { count: data.successCount }));
        }
        if (data.failedCount > 0) {
          toast.error(t("toastFailedCount", { count: data.failedCount }));
        }
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        toast.error(data.message || t("uploadFailedGeneric"));
      }
    } catch (error) {
      console.error("Bulk upload error:", error);
      toast.error(t("uploadFailedGeneric"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" asChild>
          <Link href="/vendor/products">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("step1Title")}</CardTitle>
          <CardDescription>{t("step1Desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <a href="/templates/product-bulk-upload-template.csv" download>
              <Download className="me-2 h-4 w-4" />
              {t("downloadTemplate")}
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("step2Title")}</CardTitle>
          <CardDescription>{t("step2Desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="file:bg-primary file:text-primary-foreground block w-full text-sm text-gray-500 file:me-4 file:rounded-md file:border-0 file:px-4 file:py-2 file:text-sm file:font-medium"
          />
          <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
            {uploading ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t("uploading")}
              </>
            ) : (
              <>
                <Upload className="me-2 h-4 w-4" />
                {t("upload")}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>{t("results")}</CardTitle>
            <CardDescription>{t("rowsProcessed", { count: result.totalRows })}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Badge variant="default" className="bg-green-500">
                <CheckCircle2 className="me-1 h-3 w-3" />
                {t("succeededCount", { count: result.successCount })}
              </Badge>
              <Badge variant={result.failedCount > 0 ? "destructive" : "outline"}>
                <XCircle className="me-1 h-3 w-3" />
                {t("failedCount", { count: result.failedCount })}
              </Badge>
            </div>

            {result.successCount > 0 && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>{t("submittedForApprovalTitle")}</AlertTitle>
                <AlertDescription>
                  {t("submittedForApprovalDesc", { count: result.successCount })}
                </AlertDescription>
              </Alert>
            )}

            {result.failures.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">{t("rowCol")}</TableHead>
                    <TableHead>{t("errorCol")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.failures.map((f, i) => (
                    <TableRow key={i}>
                      <TableCell>{f.row}</TableCell>
                      <TableCell className="text-red-600">{f.error}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <Button variant="outline" asChild>
              <Link href="/vendor/products">{t("backToProducts")}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
