"use client"

import React, { useState } from "react"
import { ChevronDown, ChevronUp, Shield, Scale, FileText } from "lucide-react"

const sections = [
  {
    id: 1,
    title: "Overview",
    icon: FileText,
    content: `This website is operated by Instapeels.com. Throughout the site, the terms "we", "us" and "our" refer to Instapeel. Instapeel offers this website, including all information, tools and services available from this site to you, the user, conditioned upon your acceptance of all terms, conditions, policies and notices stated here.

By visiting our site and/or purchasing something from us, you engage in our "Service" and agree to be bound by the following terms and conditions. Please read these Terms of Service carefully before accessing or using our website.`
  },
  {
    id: 2,
    title: "Online Store Terms",
    icon: Shield,
    content: `By agreeing to these Terms of Service, you represent that you are at least the age of majority in your state or province of residence, or that you are the age of majority and you have given us your consent to allow any of your minor dependents to use this site.

You may not use our products for any illegal or unauthorized purpose nor may you, in the use of the Service, violate any laws in your jurisdiction (including but not limited to copyright laws). A breach or violation of any of the Terms will result in an immediate termination of your Services.`
  },
  {
    id: 3,
    title: "General Conditions",
    icon: Scale,
    content: `We reserve the right to refuse service to anyone for any reason at any time. You understand that your content (not including credit card information), may be transferred unencrypted and involve transmissions over various networks. Credit card information is always encrypted during transfer over networks.

You agree not to reproduce, duplicate, copy, sell, resell or exploit any portion of the Service, use of the Service, or access to the Service without express written permission by us.`
  },
  {
    id: 4,
    title: "Products & Services",
    icon: FileText,
    content: `Certain chemical peel products or services may be available exclusively online through the website. These products may have limited quantities and are subject to return or exchange only according to our Return Policy.

We have made every effort to display as accurately as possible the colors and images of our products. We reserve the right to limit the sales of our products or Services to any person, geographic region or jurisdiction. All descriptions of products or product pricing are subject to change at anytime without notice.`
  },
  {
    id: 5,
    title: "Accuracy of Information",
    icon: Shield,
    content: `We are not responsible if information made available on this site is not accurate, complete or current. The material on this site is provided for general information only and should not be relied upon or used as the sole basis for making decisions without consulting primary sources.

We reserve the right to modify the contents of this site at any time, but we have no obligation to update any information on our site. You agree that it is your responsibility to monitor changes to our site.`
  },
  {
    id: 6,
    title: "Disclaimer of Warranties",
    icon: Scale,
    content: `YOUR USE OF THIS WEBSITE AND/OR PRODUCTS ARE AT YOUR SOLE RISK. THE WEBSITE AND PRODUCTS ARE OFFERED ON AN "AS IS" AND "AS AVAILABLE" BASIS.

Instapeel expressly disclaims all warranties of any kind, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose and non-infringement with respect to the products or website content.`
  },
  {
    id: 7,
    title: "Limitation of Liability",
    icon: FileText,
    content: `Instapeel's entire liability, and your exclusive remedy, with respect to the website content and products is solely limited to the amount you paid, less shipping and handling, for products purchased via the website.

Instapeel will not be liable for any direct, indirect, incidental, special or consequential damages in connection with this agreement or the products in any manner, including liabilities resulting from the use or inability to use the products.`
  },
  {
    id: 8,
    title: "Privacy & Data Protection",
    icon: Shield,
    content: `Instapeel believes strongly in protecting user privacy and providing you with notice of our use of data. Your submission of personal information through the store is governed by our Privacy Policy.

We collect device information, order information, and customer support information to provide you with the best possible service and to fulfill our contract with you.`
  },
  {
    id: 9,
    title: "Governing Law & Contact",
    icon: Scale,
    content: `These Terms of Service shall be governed by and construed in accordance with the laws of India. This website originates from Mumbai, Maharashtra. Any disputes shall be subject to the jurisdiction of courts located in Mumbai.

Questions about the Terms of Service should be sent to us at care@instapeels.com

Healthcare Medical Center, S-55, Whispering Palms Shopping Center, Akurli road,Lokhandwala Township, Kandivali (E), Mumbai, Maharashtra, 400101`
  }
]

export default function TermsOfService() {
  const [openSection, setOpenSection] = useState(1)

  const toggleSection = (id) => {
    setOpenSection(openSection === id ? null : id)
  }


  return (
    <section className="bg-gradient-to-b from-neutral-50 to-white min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 py-20 px-6">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#B18D0C] rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#B18D0C] rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#B18D0C]/20 rounded-2xl mb-6">
            <Scale className="w-10 h-10 text-[#B18D0C]" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            Terms of <span className="text-[#B18D0C]">Service</span>
          </h1>
          <p className="text-neutral-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Please read these terms carefully. By using our website or purchasing our home-use chemical peel products, you agree to these terms and conditions.
          </p>
          <div className="mt-8 text-sm text-neutral-400">
            Last Updated: 2025
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        {/* Important Notice */}
        <div className="bg-gradient-to-r from-[#B18D0C]/10 to-[#B18D0C]/5 border-l-4 border-[#B18D0C] rounded-r-xl p-6 mb-12">
          <div className="flex items-start gap-4">
            <Shield className="w-6 h-6 text-[#B18D0C] flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Important Notice</h3>
              <p className="text-neutral-700 leading-relaxed">
                This Terms of Service Agreement governs your use of www.instapeels.com and your purchase of our professional-grade, home-use chemical peel products. By using this website, you agree to be bound by all terms and conditions outlined below.
              </p>
            </div>
          </div>
        </div>

        {/* Accordion Sections */}
        <div className="space-y-4">
          {sections.map((section) => {
            const Icon = section.icon
            const isOpen = openSection === section.id
            
            return (
              <div 
                key={section.id}
                className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-neutral-100 overflow-hidden"
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-[#B18D0C]/10 p-3 rounded-xl">
                      <Icon className="w-6 h-6 text-[#B18D0C]" />
                    </div>
                    <h3 className="text-xl font-semibold text-neutral-900">
                      {section.title}
                    </h3>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-6 h-6 text-[#B18D0C]" />
                  ) : (
                    <ChevronDown className="w-6 h-6 text-neutral-400" />
                  )}
                </button>
                
                {isOpen && (
                  <div className="px-8 pb-8 pt-2">
                    <div className="pl-16">
                      <p className="text-neutral-700 leading-relaxed whitespace-pre-line">
                        {section.content}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Contact Section */}
        <div className="mt-16 bg-neutral-900 rounded-2xl p-8 md:p-12 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            Have Questions About Our Terms?
          </h3>
          <p className="text-neutral-300 text-lg mb-8 max-w-2xl mx-auto">
            Our team is here to help clarify any concerns about our terms of service and how they apply to your purchase of Instapeel products.
          </p>
          <a 
            href="mailto:care@instapeels.com"
            className="inline-block bg-[#B18D0C] hover:bg-[#8A6A09] text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Contact Us
          </a>
        </div>
      </div>
    </section>
  )
}