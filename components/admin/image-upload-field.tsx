"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Loader2 } from "lucide-react"

interface ImageUploadFieldProps {
  value: string
  onChange: (url: string) => void
  label?: string
  folder?: string
  required?: boolean
  placeholder?: string
}

export function ImageUploadField({
  value,
  onChange,
  label = "Image",
  folder = "uploads",
  required = false,
  placeholder = "https://...",
}: ImageUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select a valid image file")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image size must be less than 5MB")
      return
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append("files", file)
      formData.append("folder", folder)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Upload failed")
      }

      const data = await response.json()
      if (data.urls && data.urls.length > 0) {
        onChange(data.urls[0])
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  return (
    <div>
      <Label htmlFor="image-upload">{label}</Label>
      <Tabs defaultValue="url" className="mt-2">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="url">URL</TabsTrigger>
          <TabsTrigger value="upload">Upload File</TabsTrigger>
        </TabsList>

        <TabsContent value="url" className="space-y-2">
          <Input
            id="image-upload"
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
          />
        </TabsContent>

        <TabsContent value="upload" className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              ref={fileInputRef}
              disabled={isUploading}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Choose Image
                </>
              )}
            </Button>
          </div>
          {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
        </TabsContent>
      </Tabs>

      {/* Preview */}
      {value && (
        <div className="mt-3">
          <p className="text-sm text-muted-foreground mb-2">Preview</p>
          <img
            src={value}
            alt="preview"
            className="h-32 w-48 object-cover rounded border"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/companylogo.jpg"
            }}
          />
        </div>
      )}
    </div>
  )
}