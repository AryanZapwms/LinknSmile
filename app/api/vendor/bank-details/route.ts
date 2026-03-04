import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import Shop from '@/lib/models/shop';

/** GET /api/vendor/bank-details – returns the vendor's bank details (masked account number) */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'shop_owner') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const shopId = session.user.shopId;
    if (!shopId) {
      return NextResponse.json({ message: 'Shop not found' }, { status: 404 });
    }

    const shop = await Shop.findById(shopId).select('bankDetails shopName');
    if (!shop) {
      return NextResponse.json({ message: 'Shop not found' }, { status: 404 });
    }

    const bd = shop.bankDetails;
    const isComplete = !!(
      bd?.accountHolderName &&
      bd?.accountNumber &&
      bd?.ifscCode &&
      bd?.bankName
    );

    return NextResponse.json({
      success: true,
      bankDetails: shop.bankDetails || null,
      isComplete,
    });
  } catch (error: any) {
    console.error('[bank-details GET]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/vendor/bank-details – update/save vendor bank details.
 * Validates IFSC code format and account number length strictly.
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'shop_owner') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const shopId = session.user.shopId;
    if (!shopId) {
      return NextResponse.json({ message: 'Shop not found' }, { status: 404 });
    }

    const body = await req.json();
    const { accountHolderName, bankName, accountNumber, ifscCode, swiftCode, upiId } = body;

    // ── Required field validation ──────────────────────────────────────────────
    if (!accountHolderName?.trim()) {
      return NextResponse.json({ message: 'Account holder name is required' }, { status: 400 });
    }
    if (!bankName?.trim()) {
      return NextResponse.json({ message: 'Bank name is required' }, { status: 400 });
    }
    if (!accountNumber?.trim()) {
      return NextResponse.json({ message: 'Account number is required' }, { status: 400 });
    }
    if (!ifscCode?.trim() && !swiftCode?.trim()) {
      return NextResponse.json(
        { message: 'Either IFSC code (domestic) or SWIFT code (international) is required' },
        { status: 400 }
      );
    }

    // ── Format validation ──────────────────────────────────────────────────────
    const cleanAccountNumber = accountNumber.trim().replace(/\s/g, '');
    if (cleanAccountNumber.length < 9 || cleanAccountNumber.length > 18) {
      return NextResponse.json(
        { message: 'Account number must be between 9 and 18 digits' },
        { status: 400 }
      );
    }
    if (!/^\d+$/.test(cleanAccountNumber)) {
      return NextResponse.json(
        { message: 'Account number must contain digits only' },
        { status: 400 }
      );
    }

    if (ifscCode?.trim()) {
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(ifscCode.trim().toUpperCase())) {
        return NextResponse.json(
          { message: 'Invalid IFSC code format (e.g. HDFC0001234)' },
          { status: 400 }
        );
      }
    }

    if (swiftCode?.trim()) {
      // SWIFT/BIC: 8 or 11 characters — 4 bank + 2 country + 2 location [+ 3 branch]
      const swiftRegex = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
      if (!swiftRegex.test(swiftCode.trim().toUpperCase())) {
        return NextResponse.json(
          { message: 'Invalid SWIFT/BIC code format (e.g. HDFCINBBXXX)' },
          { status: 400 }
        );
      }
    }

    if (upiId?.trim()) {
      const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
      if (!upiRegex.test(upiId.trim())) {
        return NextResponse.json(
          { message: 'Invalid UPI ID format (e.g. name@upi)' },
          { status: 400 }
        );
      }
    }

    // ── Persist ────────────────────────────────────────────────────────────────
    const bankDetails: Record<string, string> = {
      accountHolderName: accountHolderName.trim(),
      bankName: bankName.trim(),
      accountNumber: cleanAccountNumber,
      ifscCode: ifscCode?.trim().toUpperCase() || '',
    };
    if (swiftCode?.trim()) bankDetails.swiftCode = swiftCode.trim().toUpperCase();
    if (upiId?.trim()) bankDetails.upiId = upiId.trim();

    const shop = await Shop.findByIdAndUpdate(
      shopId,
      { $set: { bankDetails } },
      { new: true, runValidators: true }
    ).select('bankDetails shopName');

    if (!shop) {
      return NextResponse.json({ message: 'Shop not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Bank details saved successfully',
      bankDetails: shop.bankDetails,
    });
  } catch (error: any) {
    console.error('[bank-details PUT]', error);
    return NextResponse.json(
      { message: 'Failed to save bank details', error: error.message },
      { status: 500 }
    );
  }
}
