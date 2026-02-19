// "use client"

// import { useEffect, useState } from "react"
// import { useRouter } from "next/navigation"
// import { useSession } from "next-auth/react"
// import Image from "next/image"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { Badge } from "@/components/ui/badge"
// import { Trash2, RefreshCw, FolderOpen, AlertTriangle } from "lucide-react"
// import { useToast } from "@/hooks/use-toast"

// interface ImageFile {
//   path: string
//   folder: string
//   filename: string
//   size: number
//   isUsed: boolean
//   usedBy: string[]
// }

// export default function ImagesPage() {
//   const router = useRouter()
//   const { data: session, status } = useSession()
//   const { toast } = useToast()
//   const [images, setImages] = useState<ImageFile[]>([])
//   const [loading, setLoading] = useState(true)
//   const [scanning, setScanning] = useState(false)
//   const [deleting, setDeleting] = useState<string | null>(null)

//   useEffect(() => {
//     if (status === "loading") return
//     if (status === "unauthenticated") {
//       router.replace("/auth/login")
//       return
//     }
//     if (!session) return
//     scanImages()
//   }, [status, session, router])

//   const scanImages = async () => {
//     setScanning(true)
//     try {
//       const res = await fetch("/api/admin/images/scan")
//       if (!res.ok) throw new Error("Failed to scan images")
//       const data = await res.json()
//       setImages(data.images || [])
//     } catch (error) {
//       console.error("Error scanning images:", error)
//       toast({
//         title: "Error",
//         description: "Failed to scan images",
//         variant: "destructive",
//       })
//     } finally {
//       setScanning(false)
//       setLoading(false)
//     }
//   }

//   const deleteImage = async (imagePath: string) => {
//     setDeleting(imagePath)
//     try {
//       const res = await fetch("/api/admin/images/delete", {
//         method: "DELETE",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ path: imagePath }),
//       })

//       if (!res.ok) throw new Error("Failed to delete image")

//       toast({
//         title: "Success",
//         description: "Image deleted successfully",
//       })

//       // Remove from local state
//       setImages(images.filter(img => img.path !== imagePath))
//     } catch (error) {
//       console.error("Error deleting image:", error)
//       toast({
//         title: "Error",
//         description: "Failed to delete image",
//         variant: "destructive",
//       })
//     } finally {
//       setDeleting(null)
//     }
//   }

//   const formatFileSize = (bytes: number) => {
//     if (bytes === 0) return '0 Bytes'
//     const k = 1024
//     const sizes = ['Bytes', 'KB', 'MB', 'GB']
//     const i = Math.floor(Math.log(bytes) / Math.log(k))
//     return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
//   }

//   const getFolderColor = (folder: string) => {
//     const colors: Record<string, string> = {
//       arrivals: "bg-blue-100 text-blue-800",
//       blogs: "bg-green-100 text-green-800",
//       carousel: "bg-purple-100 text-purple-800",
//       "shop-by-concern": "bg-orange-100 text-orange-800",
//       uploads: "bg-gray-100 text-gray-800",
//     }
//     return colors[folder] || "bg-gray-100 text-gray-800"
//   }

//   if (status === "loading" || loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="text-center">
//           <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
//           <p className="text-muted-foreground">Loading images...</p>
//         </div>
//       </div>
//     )
//   }

//   const usedImages = images.filter(img => img.isUsed)
//   const unusedImages = images.filter(img => !img.isUsed)

//   return (
//     <div className="container mx-auto p-6 space-y-6">
//       <div className="flex items-center justify-between">
//         <div>
//           <h1 className="text-3xl font-bold">Image Management</h1>
//           <p className="text-muted-foreground">
//             Manage images in public folders and remove unused files
//           </p>
//         </div>
//         <Button
//           onClick={scanImages}
//           disabled={scanning}
//           className="flex items-center gap-2"
//         >
//           <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
//           {scanning ? 'Scanning...' : 'Scan Images'}
//         </Button>
//       </div>

//       {/* Stats Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Total Images</CardTitle>
//             <FolderOpen className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">{images.length}</div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Used Images</CardTitle>
//             <div className="h-4 w-4 rounded-full bg-green-500" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold text-green-600">{usedImages.length}</div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Unused Images</CardTitle>
//             <AlertTriangle className="h-4 w-4 text-orange-500" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold text-orange-600">{unusedImages.length}</div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Images Grid */}
//       <div className="space-y-6">
//         {/* Used Images */}
//         {usedImages.length > 0 && (
//           <div>
//             <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
//               <div className="h-3 w-3 rounded-full bg-green-500" />
//               Used Images ({usedImages.length})
//             </h2>
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
//               {usedImages.map((image) => (
//                 <Card key={image.path} className="overflow-hidden">
//                   <div className="aspect-square relative">
//                     <Image
//                       src={image.path}
//                       alt={image.filename}
//                       fill
//                       className="object-cover"
//                       sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
//                     />
//                   </div>
//                   <CardContent className="p-3">
//                     <div className="space-y-2">
//                       <div className="flex items-center justify-between">
//                         <Badge className={getFolderColor(image.folder)}>
//                           {image.folder}
//                         </Badge>
//                         <Badge variant="secondary" className="bg-green-100 text-green-800">
//                           Used
//                         </Badge>
//                       </div>
//                       <p className="text-sm font-medium truncate" title={image.filename}>
//                         {image.filename}
//                       </p>
//                       <p className="text-xs text-muted-foreground">
//                         {formatFileSize(image.size)}
//                       </p>
//                       {image.usedBy.length > 0 && (
//                         <div className="text-xs text-muted-foreground">
//                           Used by: {image.usedBy.join(", ")}
//                         </div>
//                       )}
//                     </div>
//                   </CardContent>
//                 </Card>
//               ))}
//             </div>
//           </div>
//         )}

//         {/* Unused Images */}
//         {unusedImages.length > 0 && (
//           <div>
//             <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
//               <AlertTriangle className="h-5 w-5 text-orange-500" />
//               Unused Images ({unusedImages.length})
//             </h2>
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
//               {unusedImages.map((image) => (
//                 <Card key={image.path} className="overflow-hidden border-orange-200">
//                   <div className="aspect-square relative">
//                     <Image
//                       src={image.path}
//                       alt={image.filename}
//                       fill
//                       className="object-cover"
//                       sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
//                     />
//                   </div>
//                   <CardContent className="p-3">
//                     <div className="space-y-2">
//                       <div className="flex items-center justify-between">
//                         <Badge className={getFolderColor(image.folder)}>
//                           {image.folder}
//                         </Badge>
//                         <Badge variant="destructive">
//                           Unused
//                         </Badge>
//                       </div>
//                       <p className="text-sm font-medium truncate" title={image.filename}>
//                         {image.filename}
//                       </p>
//                       <p className="text-xs text-muted-foreground">
//                         {formatFileSize(image.size)}
//                       </p>
//                       <Button
//                         size="sm"
//                         variant="destructive"
//                         className="w-full mt-2"
//                         onClick={() => deleteImage(image.path)}
//                         disabled={deleting === image.path}
//                       >
//                         {deleting === image.path ? (
//                           <RefreshCw className="w-4 h-4 animate-spin mr-2" />
//                         ) : (
//                           <Trash2 className="w-4 h-4 mr-2" />
//                         )}
//                         Delete
//                       </Button>
//                     </div>
//                   </CardContent>
//                 </Card>
//               ))}
//             </div>
//           </div>
//         )}

//         {images.length === 0 && !loading && (
//           <div className="text-center py-12">
//             <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
//             <h3 className="text-lg font-medium mb-2">No images found</h3>
//             <p className="text-muted-foreground">
//               No images were found in the public folders.
//             </p>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2, RefreshCw, FolderOpen, AlertTriangle, CheckSquare, XSquare } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ImageFile {
  path: string
  folder: string
  filename: string
  size: number
  isUsed: boolean
  usedBy: string[]
}

export default function ImagesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { toast } = useToast()
  const [images, setImages] = useState<ImageFile[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [activeFolder, setActiveFolder] = useState<string>("all")

  useEffect(() => {
    if (status === "loading") return
    if (status === "unauthenticated") {
      router.replace("/auth/login")
      return
    }
    if (!session) return
    scanImages()
  }, [status, session, router])

  const scanImages = async () => {
    setScanning(true)
    setSelectedImages(new Set())
    try {
      const res = await fetch("/api/admin/images/scan")
      if (!res.ok) throw new Error("Failed to scan images")
      const data = await res.json()
      setImages(data.images || [])
    } catch (error) {
      console.error("Error scanning images:", error)
      toast({
        title: "Error",
        description: "Failed to scan images",
        variant: "destructive",
      })
    } finally {
      setScanning(false)
      setLoading(false)
    }
  }

  const deleteImage = async (imagePath: string) => {
    setDeleting(imagePath)
    try {
      const res = await fetch("/api/admin/images/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path: imagePath }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to delete image")
      }

      toast({
        title: "Success",
        description: "Image deleted successfully",
      })

      setImages(images.filter(img => img.path !== imagePath))
      setSelectedImages(prev => {
        const newSet = new Set(prev)
        newSet.delete(imagePath)
        return newSet
      })
    } catch (error: any) {
      console.error("Error deleting image:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete image",
        variant: "destructive",
      })
    } finally {
      setDeleting(null)
    }
  }

  const bulkDeleteImages = async () => {
    setBulkDeleting(true)
    const imagesToDelete = Array.from(selectedImages)
    let successCount = 0
    let failCount = 0

    for (const imagePath of imagesToDelete) {
      try {
        const res = await fetch("/api/admin/images/delete", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ path: imagePath }),
        })

        if (res.ok) {
          successCount++
          setImages(prev => prev.filter(img => img.path !== imagePath))
        } else {
          failCount++
        }
      } catch (error) {
        failCount++
        console.error("Error deleting image:", imagePath, error)
      }
    }

    setBulkDeleting(false)
    setSelectedImages(new Set())
    setShowDeleteDialog(false)

    toast({
      title: successCount > 0 ? "Success" : "Error",
      description: `Deleted ${successCount} image(s). ${failCount > 0 ? `Failed to delete ${failCount} image(s).` : ''}`,
      variant: successCount > 0 ? "default" : "destructive",
    })
  }

  const toggleImageSelection = (imagePath: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev)
      if (newSet.has(imagePath)) {
        newSet.delete(imagePath)
      } else {
        newSet.add(imagePath)
      }
      return newSet
    })
  }

  const selectAllInFolder = (folder: string, used: boolean) => {
    const folderImages = getFilteredImages(folder, used)
    const allPaths = folderImages.map(img => img.path)
    
    const allSelected = allPaths.every(path => selectedImages.has(path))
    
    setSelectedImages(prev => {
      const newSet = new Set(prev)
      if (allSelected) {
        allPaths.forEach(path => newSet.delete(path))
      } else {
        allPaths.forEach(path => newSet.add(path))
      }
      return newSet
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFolderColor = (folder: string) => {
    const colors: Record<string, string> = {
      arrivals: "bg-blue-100 text-blue-800 border-blue-200",
      blogs: "bg-green-100 text-green-800 border-green-200",
      carousel: "bg-purple-100 text-purple-800 border-purple-200",
      "shop-by-concern": "bg-orange-100 text-orange-800 border-orange-200",
      uploads: "bg-gray-100 text-gray-800 border-gray-200",
    }
    return colors[folder] || "bg-gray-100 text-gray-800 border-gray-200"
  }

  const getFolderIcon = (folder: string) => {
    return folder.charAt(0).toUpperCase() + folder.slice(1).replace(/-/g, ' ')
  }

  const folders = Array.from(new Set(images.map(img => img.folder))).sort()

  const getFilteredImages = (folder: string, used: boolean) => {
    return images.filter(img => 
      (folder === "all" || img.folder === folder) && 
      img.isUsed === used
    )
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading images...</p>
        </div>
      </div>
    )
  }

  const usedImages = images.filter(img => img.isUsed)
  const unusedImages = images.filter(img => !img.isUsed)
  const selectedUnusedCount = Array.from(selectedImages).filter(path => 
    unusedImages.some(img => img.path === path)
  ).length

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Image Management</h1>
          <p className="text-muted-foreground">
            Manage images by folder and remove unused files
          </p>
        </div>
        <div className="flex gap-2">
          {selectedImages.size > 0 && (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={bulkDeleting}
              className="flex items-center gap-2"
            >
              {bulkDeleting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete Selected ({selectedImages.size})
            </Button>
          )}
          <Button
            onClick={scanImages}
            disabled={scanning}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scanning...' : 'Scan Images'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Images</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{images.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Used Images</CardTitle>
            <div className="h-4 w-4 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{usedImages.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unused Images</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unusedImages.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Folders</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{folders.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Folder Tabs */}
      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveFolder}>
        <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
          <TabsTrigger value="all">All Folders</TabsTrigger>
          {folders.map(folder => (
            <TabsTrigger key={folder} value={folder}>
              {getFolderIcon(folder)}
            </TabsTrigger>
          ))}
        </TabsList>

        {["all", ...folders].map(folder => (
          <TabsContent key={folder} value={folder} className="space-y-6">
            {/* Used Images Section */}
            {getFilteredImages(folder, true).length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    Used Images ({getFilteredImages(folder, true).length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {getFilteredImages(folder, true).map((image) => (
                    <Card key={image.path} className="overflow-hidden">
                      <div className="aspect-square relative">
                        <Image
                          src={image.path}
                          alt={image.filename}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        />
                      </div>
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge className={getFolderColor(image.folder)}>
                              {image.folder}
                            </Badge>
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Used
                            </Badge>
                          </div>
                          <p className="text-sm font-medium truncate" title={image.filename}>
                            {image.filename}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(image.size)}
                          </p>
                          {image.usedBy.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Used by: {image.usedBy.join(", ")}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Unused Images Section */}
            {getFilteredImages(folder, false).length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Unused Images ({getFilteredImages(folder, false).length})
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectAllInFolder(folder, false)}
                    className="flex items-center gap-2"
                  >
                    {getFilteredImages(folder, false).every(img => selectedImages.has(img.path)) ? (
                      <>
                        <XSquare className="w-4 h-4" />
                        Deselect All
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-4 h-4" />
                        Select All
                      </>
                    )}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {getFilteredImages(folder, false).map((image) => (
                    <Card 
                      key={image.path} 
                      className={`overflow-hidden border-orange-200 relative ${
                        selectedImages.has(image.path) ? 'ring-2 ring-orange-500' : ''
                      }`}
                    >
                      <div className="absolute top-2 left-2 z-10">
                        <Checkbox
                          checked={selectedImages.has(image.path)}
                          onCheckedChange={() => toggleImageSelection(image.path)}
                          className="bg-white border-2"
                        />
                      </div>
                      <div className="aspect-square relative">
                        <Image
                          src={image.path}
                          alt={image.filename}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        />
                      </div>
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge className={getFolderColor(image.folder)}>
                              {image.folder}
                            </Badge>
                            <Badge variant="destructive">
                              Unused
                            </Badge>
                          </div>
                          <p className="text-sm font-medium truncate" title={image.filename}>
                            {image.filename}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(image.size)}
                          </p>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="w-full mt-2"
                            onClick={() => deleteImage(image.path)}
                            disabled={deleting === image.path}
                          >
                            {deleting === image.path ? (
                              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <Trash2 className="w-4 h-4 mr-2" />
                            )}
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {getFilteredImages(folder, true).length === 0 && 
             getFilteredImages(folder, false).length === 0 && (
              <div className="text-center py-12">
                <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No images found</h3>
                <p className="text-muted-foreground">
                  No images in this folder.
                </p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedImages.size} images?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected images from the server.
              {selectedUnusedCount < selectedImages.size && (
                <div className="mt-2 text-orange-600 font-semibold">
                  Warning: {selectedImages.size - selectedUnusedCount} of the selected images are marked as "used" and may be referenced in your content.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={bulkDeleteImages}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}