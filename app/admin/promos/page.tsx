"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface Promo {
    _id: string
    title: string
    message: string
    link?: string
    linkText?: string
    backgroundColor: string
    textColor: string
    isActive: boolean
    priority: number
    createdAt: string
}

export default function PromosPage() {
    const [promos, setPromos] = useState<Promo[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [editingPromo, setEditingPromo] = useState<Promo | null>(null)
    const [formData, setFormData] = useState({
        title: "",
        message: "",
        link: "",
        linkText: "",
        backgroundColor: "#000000",
        textColor: "#ffffff",
        isActive: true,
        priority: 0,
    })
    const { toast } = useToast()

    useEffect(() => {
        fetchPromos()
    }, [])

    const fetchPromos = async () => {
        try {
            const res = await fetch("/api/promos")
            if (res.ok) {
                const data = await res.json()
                setPromos(data)
            } else {
                toast({
                    title: "Error",
                    description: "Failed to fetch promos",
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.error("Error fetching promos:", error)
            toast({
                title: "Error",
                description: "Failed to fetch promos",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const url = editingPromo ? `/api/promos/${editingPromo._id}` : "/api/promos"
            const method = editingPromo ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })

            if (res.ok) {
                toast({
                    title: "Success",
                    description: `Promo ${editingPromo ? "updated" : "created"} successfully`,
                })
                setFormData({
                    title: "",
                    message: "",
                    link: "",
                    linkText: "",
                    backgroundColor: "#000000",
                    textColor: "#ffffff",
                    isActive: true,
                    priority: 0,
                })
                setShowForm(false)
                setEditingPromo(null)
                fetchPromos()
            } else {
                const error = await res.json()
                toast({
                    title: "Error",
                    description: error.error || "Failed to save promo",
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.error("Error saving promo:", error)
            toast({
                title: "Error",
                description: "Failed to save promo",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleEdit = (promo: Promo) => {
        setEditingPromo(promo)
        setFormData({
            title: promo.title,
            message: promo.message,
            link: promo.link || "",
            linkText: promo.linkText || "",
            backgroundColor: promo.backgroundColor,
            textColor: promo.textColor,
            isActive: promo.isActive,
            priority: promo.priority,
        })
        setShowForm(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this promo?")) return

        try {
            const res = await fetch(`/api/promos/${id}`, {
                method: "DELETE",
            })

            if (res.ok) {
                toast({
                    title: "Success",
                    description: "Promo deleted successfully",
                })
                fetchPromos()
            } else {
                toast({
                    title: "Error",
                    description: "Failed to delete promo",
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.error("Error deleting promo:", error)
            toast({
                title: "Error",
                description: "Failed to delete promo",
                variant: "destructive",
            })
        }
    }

    const resetForm = () => {
        setFormData({
            title: "",
            message: "",
            link: "",
            linkText: "",
            backgroundColor: "#000000",
            textColor: "#ffffff",
            isActive: true,
            priority: 0,
        })
        setEditingPromo(null)
        setShowForm(false)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Loading promos...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Promo Bar Management</h1>
                    <p className="text-muted-foreground">Manage promotional banners and messages</p>
                </div>
                <Button onClick={() => setShowForm(true)} disabled={showForm}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Promo
                </Button>
            </div>

            {showForm && (
                <Card>
                    <CardHeader>
                        <CardTitle>{editingPromo ? "Edit Promo" : "Add New Promo"}</CardTitle>
                        <CardDescription>
                            {editingPromo ? "Update the promo details" : "Create a new promotional banner"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Title (Optional)</Label>
                                    <Input
                                        id="title"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        // required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="priority">Priority (Higher = More Important)</Label>
                                    <Input
                                        id="priority"
                                        type="number"
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="message">Message</Label>
                                <Textarea
                                    id="message"
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    required
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="link">Link URL (Optional)</Label>
                                    <Input
                                        id="link"
                                        type="url"
                                        value={formData.link}
                                        onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                                        placeholder="https://example.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="linkText">Link Text (Optional)</Label>
                                    <Input
                                        id="linkText"
                                        value={formData.linkText}
                                        onChange={(e) => setFormData({ ...formData, linkText: e.target.value })}
                                        placeholder="Shop Now"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="backgroundColor">Background Color</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="backgroundColor"
                                            type="color"
                                            value={formData.backgroundColor}
                                            onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                                            className="w-16 h-10 p-1"
                                        />
                                        <Input
                                            value={formData.backgroundColor}
                                            onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                                            placeholder="#000000"
                                            className="flex-1"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="textColor">Text Color</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="textColor"
                                            type="color"
                                            value={formData.textColor}
                                            onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                                            className="w-16 h-10 p-1"
                                        />
                                        <Input
                                            value={formData.textColor}
                                            onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                                            placeholder="#ffffff"
                                            className="flex-1"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="isActive"
                                    checked={formData.isActive}
                                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                                />
                                <Label htmlFor="isActive">Active</Label>
                            </div>

                            {/* Preview */}
                            <div className="space-y-2">
                                <Label>Preview</Label>
                                <div
                                    className="p-4 rounded-md text-center"
                                    style={{
                                        backgroundColor: formData.backgroundColor,
                                        color: formData.textColor,
                                    }}
                                >
                                    <p className="font-semibold">{formData.title}</p>
                                    <p>{formData.message}</p>
                                    {formData.link && formData.linkText && (
                                        <p className="mt-2 underline cursor-pointer">{formData.linkText}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? "Saving..." : editingPromo ? "Update Promo" : "Create Promo"}
                                </Button>
                                <Button type="button" variant="outline" onClick={resetForm}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4">
                {promos.length === 0 ? (
                    <Card>
                        <CardContent className="flex items-center justify-center h-32">
                            <p className="text-muted-foreground">No promos found. Create your first promo above.</p>
                        </CardContent>
                    </Card>
                ) : (
                    promos.map((promo) => (
                        <Card key={promo._id}>
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="font-semibold">{promo.title}</h3>
                                            <Badge variant={promo.isActive ? "default" : "secondary"}>
                                                {promo.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                            <Badge variant="outline">Priority: {promo.priority}</Badge>
                                        </div>
                                        <p className="text-muted-foreground mb-2">{promo.message}</p>
                                        {promo.link && promo.linkText && (
                                            <p className="text-sm text-blue-600 mb-2">
                                                Link: {promo.linkText} → {promo.link}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <span>Created: {new Date(promo.createdAt).toLocaleDateString()}</span>
                                            <div className="flex items-center gap-1">
                                                <div
                                                    className="w-4 h-4 rounded border"
                                                    style={{ backgroundColor: promo.backgroundColor }}
                                                />
                                                <span>Background: {promo.backgroundColor}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div
                                                    className="w-4 h-4 rounded border"
                                                    style={{ backgroundColor: promo.textColor }}
                                                />
                                                <span>Text: {promo.textColor}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => handleEdit(promo)}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => handleDelete(promo._id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}