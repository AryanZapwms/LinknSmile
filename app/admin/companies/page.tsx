"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Plus, Edit, Trash2, Building2, Image as ImageIcon, X, Sparkles, HeartPulse, GripVertical } from "lucide-react"
import { ImageUploadField } from "@/components/admin/image-upload-field" 

interface CarouselImage {
    _id?: string
    url: string
    title?: string
    description?: string    
}

interface NewArrival {
    _id?: string
    productId: string
    position: number
    addedAt: string
}

interface Company {
    _id: string
    name: string
    slug: string
    description?: string
    logo?: string
    banner?: string
    email?: string
    phone?: string
    website?: string
    position?: number
    carouselImages?: CarouselImage[]
    newArrivals?: NewArrival[]
    newArrivalsSettings?: {
        isVisible: boolean
        limit: number
    }
    isActive: boolean
    createdAt: string
    updatedAt: string
}

export default function CompaniesPage() {
    const router = useRouter()
    const { data: session } = useSession()
    const [companies, setCompanies] = useState<Company[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [selectedCompanyForCarousel, setSelectedCompanyForCarousel] = useState<Company | null>(null)
    const [showCarouselModal, setShowCarouselModal] = useState(false)
    const [draggedCompany, setDraggedCompany] = useState<Company | null>(null)
    const [isSavingOrder, setIsSavingOrder] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        description: "",
        logo: "",
        banner: "",
        email: "",
        phone: "",
        website: "",
        isActive: true,
    })
    const [carouselForm, setCarouselForm] = useState({
        url: "",
        file: null as File | null,
        title: "",
        description: "",
        uploadType: "url" as "url" | "file", // Toggle between URL and file upload
    })

    useEffect(() => {
        if (!session) {
            router.push("/auth/login")
            return
        }

        fetchCompanies()
    }, [session, router])

    const fetchCompanies = async () => {
        try {
            // Add timestamp to bust cache
            const res = await fetch(`/api/companies?all=true&t=${Date.now()}`)
            const data = await res.json()
            setCompanies(data)
        } catch (error) {
            console.error("Error fetching companies:", error)
        } finally {
            setLoading(false)
        }
    }

    const migrateCompanies = async () => {
        try {
            const res = await fetch("/api/companies/migrate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            })
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || "Migration failed")
            }
            console.log("Migration successful:", data)
            alert("yess!!!! Companies migrated ho gyiii! sab position set ho gyiiii...")
            await fetchCompanies()
        } catch (error) {
            console.error("Error migrating companies:", error)
            alert(`Migration failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }))
    }

    const handleCarouselChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const target = e.target as HTMLInputElement;
        const { name } = target;

        if (name === "image" && target.type === "file") {
            const file = target.files?.[0] || null;
            setCarouselForm((prev) => ({
                ...prev,
                file,
            }))
        } else {
            const value = (e.target as HTMLInputElement | HTMLTextAreaElement).value;
            setCarouselForm((prev) => ({
                ...prev,
                [name]: value,
            }))
        }
    }

    const handleUploadTypeChange = (type: "url" | "file") => {
        setCarouselForm((prev) => ({
            ...prev,
            uploadType: type,
            url: "",
            file: null,
        }))
    }

    const handleToggle = (checked: boolean) => {
        setFormData((prev) => ({ ...prev, isActive: checked }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const url = editingId ? `/api/companies/${editingId}` : "/api/companies"
            const method = editingId ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })

            if (!res.ok) throw new Error("Failed to save company")

            await fetchCompanies()
            resetForm()
        } catch (error) {
            console.error("Error saving company:", error)
            alert("Failed to save company")
        } finally {
            setLoading(false)
        }
    }

    const handleAddCarouselImage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedCompanyForCarousel) return

        // Validate input
        if (carouselForm.uploadType === "url" && !carouselForm.url) {
            alert("Please enter an image URL")
            return
        }
        if (carouselForm.uploadType === "file" && !carouselForm.file) {
            alert("Please select an image file")
            return
        }

        try {
            let response;

            if (carouselForm.uploadType === "file" && carouselForm.file) {
                // File upload - use FormData
                const formData = new FormData()
                formData.append("image", carouselForm.file)
                formData.append("title", carouselForm.title)
                formData.append("description", carouselForm.description)

                response = await fetch(`/api/companies/${selectedCompanyForCarousel._id}/carousel`, {
                    method: "POST",
                    body: formData,
                })
            } else {
                // URL upload - use JSON
                response = await fetch(`/api/companies/${selectedCompanyForCarousel._id}/carousel`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        url: carouselForm.url,
                        title: carouselForm.title,
                        description: carouselForm.description,
                    }),
                })
            }

            if (!response.ok) throw new Error("Failed to add carousel image")

            // Fetch fresh company data by ID
            const freshRes = await fetch(`/api/companies/${selectedCompanyForCarousel._id}`)
            const updatedCompany = await freshRes.json()

            console.log("Updated company:", updatedCompany.name, "Carousel count:", updatedCompany.carouselImages?.length)

            if (updatedCompany && updatedCompany._id) {
                // Update the selected company in the modal
                setSelectedCompanyForCarousel(updatedCompany)

                // Also refresh the companies list
                await fetchCompanies()

                console.log("Carousel updated! New count:", updatedCompany.carouselImages?.length)
            }

            // Reset form
            setCarouselForm({ url: "", file: null, title: "", description: "", uploadType: "url" })
            alert("Carousel image added successfully!")
        } catch (error) {
            console.error("Error adding carousel image:", error)
            alert("Failed to add carousel image")
        }
    }

    const handleRemoveCarouselImage = async (imageId?: string) => {
        if (!selectedCompanyForCarousel || !imageId) return

        try {
            const res = await fetch(
                `/api/companies/${selectedCompanyForCarousel._id}/carousel/${imageId}`,
                { method: "DELETE" }
            )

            if (!res.ok) throw new Error("Failed to remove carousel image")

            // Fetch fresh company data by ID
            const freshRes = await fetch(`/api/companies/${selectedCompanyForCarousel._id}`)
            const updatedCompany = await freshRes.json()

            if (updatedCompany && updatedCompany._id) {
                // Update the selected company in the modal
                setSelectedCompanyForCarousel(updatedCompany)

                // Also refresh the companies list
                await fetchCompanies()

                console.log("Carousel image removed! New count:", updatedCompany.carouselImages?.length)
            }
        } catch (error) {
            console.error("Error removing carousel image:", error)
            alert("Failed to remove carousel image")
        }
    }

    const handleEdit = (company: Company) => {
        setFormData({
            name: company.name,
            slug: company.slug,
            description: company.description || "",
            logo: company.logo || "",
            banner: company.banner || "",
            email: company.email || "",
            phone: company.phone || "",
            website: company.website || "",
            isActive: company.isActive,
        })
        setEditingId(company._id)
        setShowForm(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this company?")) return

        try {
            const res = await fetch(`/api/companies/${id}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Failed to delete company")

            await fetchCompanies()
        } catch (error) {
            console.error("Error deleting company:", error)
            alert("Failed to delete company")
        }
    }

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, company: Company) => {
        setDraggedCompany(company)
        e.dataTransfer.effectAllowed = "move"
    }

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
    }

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetCompany: Company) => {
        e.preventDefault()
        
        if (!draggedCompany || draggedCompany._id === targetCompany._id) {
            setDraggedCompany(null)
            return
        }

        // Reorder companies locally
        const draggedIndex = companies.findIndex(c => c._id === draggedCompany._id)
        const targetIndex = companies.findIndex(c => c._id === targetCompany._id)

        if (draggedIndex === -1 || targetIndex === -1) {
            console.error("Could not find dragged or target company")
            setDraggedCompany(null)
            return
        }

        const newCompanies = [...companies]
        
        // Remove from old position
        newCompanies.splice(draggedIndex, 1)
        
        // Insert at new position (adjust if needed after removal)
        const newTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex
        newCompanies.splice(newTargetIndex, 0, draggedCompany)

        console.log(`Dragging ${draggedCompany.name} from index ${draggedIndex} to ${newTargetIndex}`)
        
        setCompanies(newCompanies)
        setDraggedCompany(null)

        // Save to backend
        await saveCompanyOrder(newCompanies)
    }

    const handleDragEnd = () => {
        setDraggedCompany(null)
    }

    const saveCompanyOrder = async (orderedCompanies: Company[]) => {
        try {
            setIsSavingOrder(true)
            console.log("Saving company order:", orderedCompanies.map(c => ({ name: c.name, position: orderedCompanies.indexOf(c) })))
            
            const res = await fetch("/api/companies/reorder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ companies: orderedCompanies }),
            })

            const data = await res.json()
            console.log("Reorder response:", data)

            if (!res.ok) {
                throw new Error(data.error || "Failed to save order")
            }
            
            console.log("Company order saved successfully, refetching data...")
            // Refetch to verify the order was saved
            await fetchCompanies()
        } catch (error) {
            console.error("Error saving company order:", error)
            alert(`Failed to save company order: ${error instanceof Error ? error.message : String(error)}`)
            // Refetch to revert changes
            await fetchCompanies()
        } finally {
            setIsSavingOrder(false)
        }
    }

    const openCarouselModal = (company: Company) => {
        setSelectedCompanyForCarousel(company)
        setShowCarouselModal(true)
    }

    const resetForm = () => {
        setFormData({
            name: "",
            slug: "",
            description: "",
            logo: "",
            banner: "",
            email: "",
            phone: "",
            website: "",
            isActive: true,
        })
        setEditingId(null)
        setShowForm(false)
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground">Loading companies...</p>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/admin">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Admin
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">Companies</h1>
                            <p className="text-muted-foreground">Manage your skincare brands</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            onClick={migrateCompanies} 
                            variant="outline"
                            size="sm"
                            title="Initialize company positions for drag-and-drop reordering"
                        >
                            🔄 Migrate Positions
                        </Button>
                        <Button onClick={() => setShowForm(true)} className="bg-primary text-primary-foreground">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Company
                        </Button>
                    </div>
                </div>

                {/* Form */}
                {showForm && (
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle>{editingId ? "Edit Company" : "Add New Company"}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Company Name *</label>
                                        <Input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="e.g., InstaPeels"
                                            required
                                            className="bg-background border-border"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Slug *</label>
                                        <Input
                                            type="text"
                                            name="slug"
                                            value={formData.slug}
                                            onChange={handleChange}
                                            placeholder="e.g., instapeels"
                                            required
                                            className="bg-background border-border"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                                    <Textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        placeholder="Company description..."
                                        rows={3}
                                        className="bg-background border-border"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <ImageUploadField
                                            label="Logo"
                                            value={formData.logo}
                                            onChange={(url) => setFormData({ ...formData, logo: url })}
                                            folder="companies"
                                        />
                                    </div>
                                    <div>
                                        <ImageUploadField
                                            label="Banner"
                                            value={formData.banner}
                                            onChange={(url) => setFormData({ ...formData, banner: url })}
                                            folder="companies"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                                        <Input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="contact@company.com"
                                            className="bg-background border-border"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
                                        <Input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder="+1 234 567 8900"
                                            className="bg-background border-border"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Website</label>
                                        <Input
                                            type="url"
                                            name="website"
                                            value={formData.website}
                                            onChange={handleChange}
                                            placeholder="https://company.com"
                                            className="bg-background border-border"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Switch checked={formData.isActive} onCheckedChange={handleToggle} />
                                    <label className="text-sm font-medium text-foreground">Active</label>
                                </div>

                                <div className="flex gap-2">
                                    <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground">
                                        {loading ? "Saving..." : editingId ? "Update Company" : "Create Company"}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={resetForm}>
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Companies List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {companies.map((company) => (
                        <Card
                            key={company._id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, company)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, company)}
                            onDragEnd={handleDragEnd}
                            className={`hover:shadow-lg transition cursor-move ${
                                draggedCompany?._id === company._id
                                    ? "opacity-50 border-primary border-2"
                                    : ""
                            } ${isSavingOrder ? "pointer-events-none opacity-75" : ""}`}
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <GripVertical className="w-5 h-5 text-muted-foreground hover:text-primary transition flex-shrink-0" />
                                        <Building2 className="w-8 h-8 text-primary" />
                                        <div>
                                            <CardTitle className="text-lg">{company.name}</CardTitle>
                                            <p className="text-sm text-muted-foreground">/{company.slug}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEdit(company)}
                                            className="h-8 w-8 p-0"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDelete(company._id)}
                                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                {company.description && (
                                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{company.description}</p>
                                )}

                                <div className="space-y-2 text-xs text-muted-foreground mb-3">
                                    {company.email && <p>📧 {company.email}</p>}
                                    {company.phone && <p>📞 {company.phone}</p>}
                                    {company.website && <p>🌐 {company.website}</p>}
                                </div>

                                {/* Carousel Badge and New Arrivals */}
                                <div className="mb-3 pb-3 border-t border-border pt-3 space-y-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openCarouselModal(company)}
                                        className="w-full text-sm"
                                    >
                                        <ImageIcon className="w-4 h-4 mr-2" />
                                        Carousel ({company.carouselImages?.length || 0})
                                    </Button>
                                    <Link href={`/admin/companies/${company._id}/new-arrivals`}>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full text-sm"
                                        >
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            New Arrivals ({company.newArrivals?.length || 0})
                                        </Button>
                                    </Link>
                                    <Link href={`/admin/companies/${company._id}/shop-by-concern`}>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full text-sm"
                                        >
                                            <HeartPulse className="w-4 h-4 mr-2" />
                                            Shop By Concern ({company.shopByConcern?.length || 0})
                                        </Button>
                                    </Link>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span
                                        className={`px-2 py-1 rounded text-xs font-semibold ${company.isActive
                                            ? "bg-green-100 text-green-800"
                                            : "bg-red-100 text-red-800"
                                            }`}
                                    >
                                        {company.isActive ? "Active" : "Inactive"}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(company.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {companies.length === 0 && (
                    <div className="text-center py-12">
                        <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">No companies yet</h3>
                        <p className="text-muted-foreground mb-4">Create your first skincare brand to get started</p>
                        <Button onClick={() => setShowForm(true)} className="bg-primary text-primary-foreground">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Company
                        </Button>
                    </div>
                )}
            </div>

            {/* Carousel Management Modal */}
            {selectedCompanyForCarousel && (
                <Dialog open={showCarouselModal} onOpenChange={setShowCarouselModal}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Manage Carousel - {selectedCompanyForCarousel.name}</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6">
                            {/* Add New Image Form */}
                            <div className="bg-muted/50 p-4 rounded-lg">
                                <h3 className="font-semibold mb-4">Add New Carousel Image</h3>

                                <form onSubmit={handleAddCarouselImage} className="space-y-4">
                                    <ImageUploadField
                                        label="Carousel Image"
                                        value={carouselForm.url}
                                        onChange={(url) => setCarouselForm({ ...carouselForm, url })}
                                        folder="carousel"
                                    />
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Title (Optional)</label>
                                        <Input
                                            type="text"
                                            name="title"
                                            value={carouselForm.title}
                                            onChange={handleCarouselChange}
                                            placeholder="e.g., Summer Collection"
                                            className="bg-background border-border"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Description (Optional)</label>
                                        <Textarea
                                            name="description"
                                            value={carouselForm.description}
                                            onChange={handleCarouselChange}
                                            placeholder="Carousel image description..."
                                            rows={2}
                                            className="bg-background border-border"
                                        />
                                    </div>
                                    <Button type="submit" className="bg-primary text-primary-foreground w-full">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Image
                                    </Button>
                                </form>
                            </div>

                            {/* Current Images */}
                            <div>
                                <h3 className="font-semibold mb-4">
                                    Current Images ({selectedCompanyForCarousel.carouselImages?.length || 0})
                                </h3>
                                {selectedCompanyForCarousel.carouselImages && selectedCompanyForCarousel.carouselImages.length > 0 ? (
                                    <div className="space-y-3">
                                        {selectedCompanyForCarousel.carouselImages.map((image, idx) => (
                                            <Card key={image._id} className="bg-muted/50">
                                                <CardContent className="pt-6">
                                                    <div className="flex gap-4">
                                                        {/* Image Preview */}
                                                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-background flex-shrink-0">
                                                            <img
                                                                src={image.url}
                                                                alt={image.title || "Carousel image"}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                        {/* Image Info */}
                                                        <div className="flex-1">
                                                            <p className="font-medium text-sm">
                                                                {image.title || "Untitled"}
                                                            </p>
                                                            {image.description && (
                                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                                    {image.description}
                                                                </p>
                                                            )}
                                                            <p className="text-xs text-muted-foreground mt-2 break-all">
                                                                {image.url}
                                                            </p>
                                                        </div>
                                                        {/* Delete Button */}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemoveCarouselImage(image._id)}
                                                            className="text-destructive hover:text-destructive h-8 w-8 p-0"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-6">
                                        No carousel images yet. Add one to get started!
                                    </p>
                                )}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </main>
    )
}