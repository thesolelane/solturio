import jsPDF from "jspdf";
import QRCode from "qrcode";
import { createHash } from "crypto";

interface LogoRegistration {
  id: string;
  fileName: string;
  fileHash: string;
  ipfsHash?: string;
  userId: string;
  userEmail: string;
  companyName: string;
  description: string;
  ownershipDescription: string;
  intendedUse: string;
  registrationDate: Date;
  copyrightStatus?: string | null;
  copyrightApplicationNumber?: string | null;
  trademarkStatus?: string | null;
  trademarkApplicationNumber?: string | null;
  patentStatus?: string | null;
  patentApplicationNumber?: string | null;
  transactionHash?: string;
  blockNumber?: number;
}

/**
 * Generate a Prior Art Certificate PDF
 */
export async function generatePriorArtCertificate(registration: LogoRegistration): Promise<Buffer> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("CERTIFICATE OF PRIOR ART", pageWidth / 2, 30, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("BLOCKCHAIN-VERIFIED FIRST USE REGISTRATION", pageWidth / 2, 40, { align: "center" });

  // Certificate border
  doc.setLineWidth(1);
  doc.rect(15, 50, pageWidth - 30, 200, "S");

  // Certificate ID
  doc.setFontSize(10);
  doc.text(`Certificate ID: ${registration.id}`, 20, 60);
  doc.text(`Registration Date: ${registration.registrationDate.toISOString()}`, 20, 67);

  // Main content
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("REGISTERED ASSET", 20, 80);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`File Name: ${registration.fileName}`, 25, 87);
  doc.text(`File Hash (SHA-256): ${registration.fileHash}`, 25, 94);
  if (registration.ipfsHash) {
    doc.text(`IPFS Hash: ${registration.ipfsHash}`, 25, 101);
  }

  // Ownership Information
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("OWNERSHIP CLAIM", 20, 115);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Registrant: ${registration.companyName}`, 25, 122);
  doc.text(`Email: ${registration.userEmail}`, 25, 129);

  // Wrap long text
  const ownershipLines = doc.splitTextToSize(
    `Ownership Description: ${registration.ownershipDescription}`,
    pageWidth - 50
  );
  let yPos = 136;
  ownershipLines.forEach((line: string) => {
    doc.text(line, 25, yPos);
    yPos += 7;
  });

  // IP Protection Status
  if (registration.copyrightStatus && registration.copyrightStatus !== "none") {
    yPos += 5;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("IP PROTECTION STATUS", 20, yPos);
    yPos += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    if (registration.copyrightStatus) {
      doc.text(`Copyright: ${registration.copyrightStatus.toUpperCase()}`, 25, yPos);
      if (registration.copyrightApplicationNumber) {
        doc.text(` - Application #: ${registration.copyrightApplicationNumber}`, 80, yPos);
      }
      yPos += 7;
    }

    if (registration.trademarkStatus && registration.trademarkStatus !== "none") {
      doc.text(`Trademark: ${registration.trademarkStatus.toUpperCase()}`, 25, yPos);
      if (registration.trademarkApplicationNumber) {
        doc.text(` - Application #: ${registration.trademarkApplicationNumber}`, 80, yPos);
      }
      yPos += 7;
    }

    if (registration.patentStatus && registration.patentStatus !== "none") {
      doc.text(`Patent: ${registration.patentStatus.toUpperCase()}`, 25, yPos);
      if (registration.patentApplicationNumber) {
        doc.text(` - Application #: ${registration.patentApplicationNumber}`, 80, yPos);
      }
      yPos += 7;
    }
  }

  // Blockchain verification
  yPos = 200;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("BLOCKCHAIN VERIFICATION", 20, yPos);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (registration.transactionHash) {
    doc.text(`Transaction Hash: ${registration.transactionHash}`, 25, yPos + 7);
    doc.text(`Block Number: ${registration.blockNumber || "Pending"}`, 25, yPos + 14);
  } else {
    doc.text("Status: Pending blockchain confirmation", 25, yPos + 7);
  }

  // Generate QR code for verification URL
  const verificationUrl = `https://solturio.app/verify/${registration.id}`;
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, { width: 60 });
  doc.addImage(qrDataUrl, "PNG", pageWidth - 80, 195, 60, 60);

  // Footer
  doc.setFontSize(8);
  doc.text("This certificate provides evidence of prior art and first use.", pageWidth / 2, 265, {
    align: "center",
  });
  doc.text("It does not constitute legal advice or formal IP registration.", pageWidth / 2, 270, {
    align: "center",
  });
  doc.text("Verify authenticity at: " + verificationUrl, pageWidth / 2, 275, { align: "center" });

  // Return as buffer
  return Buffer.from(doc.output("arraybuffer"));
}

/**
 * Generate a DMCA Takedown Notice template
 */
export async function generateDMCATakedownNotice(
  registration: LogoRegistration,
  infringementDetails: {
    infringingSite: string;
    infringementUrl: string;
    infringementDescription: string;
    contactEmail?: string;
  }
): Promise<Buffer> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const lineHeight = 7;
  let yPos = 30;

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("DMCA TAKEDOWN NOTICE", pageWidth / 2, yPos, { align: "center" });
  yPos += 15;

  // Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, yPos);
  yPos += lineHeight * 2;

  // To section
  doc.text("TO: " + infringementDetails.infringingSite, margin, yPos);
  if (infringementDetails.contactEmail) {
    yPos += lineHeight;
    doc.text("Email: " + infringementDetails.contactEmail, margin, yPos);
  }
  yPos += lineHeight * 2;

  // Subject
  doc.setFont("helvetica", "bold");
  doc.text("RE: COPYRIGHT INFRINGEMENT - TAKEDOWN NOTICE", margin, yPos);
  yPos += lineHeight * 2;

  // Body
  doc.setFont("helvetica", "normal");
  const bodyText = [
    "Dear Service Provider,",
    "",
    'This letter is official notification under Section 512(c) of the Digital Millennium Copyright Act ("DMCA") that:',
    "",
    "1. I am the copyright owner of the following work:",
    `   - Work: ${registration.fileName}`,
    `   - Description: ${registration.description}`,
    `   - First Use Date: ${registration.registrationDate.toLocaleDateString()}`,
    `   - Registration ID: ${registration.id}`,
    "",
    "2. The following content is infringing upon my copyrighted work:",
    `   - URL: ${infringementDetails.infringementUrl}`,
    `   - Description: ${infringementDetails.infringementDescription}`,
    "",
    "3. Contact Information:",
    `   - Name: ${registration.companyName}`,
    `   - Email: ${registration.userEmail}`,
    "",
    "4. Good Faith Statement:",
    "I have a good faith belief that use of the copyrighted materials described above is not authorized by the copyright owner, its agent, or the law.",
    "",
    "5. Accuracy Statement:",
    "I swear, under penalty of perjury, that the information in this notification is accurate and that I am the copyright owner or am authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.",
    "",
    "6. Blockchain Verification:",
    `This work has been registered on the blockchain with hash: ${registration.fileHash}`,
    registration.ipfsHash ? `IPFS Hash: ${registration.ipfsHash}` : "",
    `Verification available at: https://solturio.app/verify/${registration.id}`,
    "",
    "Please expeditiously remove or disable access to the infringing material.",
    "",
    "Sincerely,",
    "",
    "_______________________",
    registration.companyName,
  ];

  bodyText.forEach((line) => {
    if (line) {
      const lines = doc.splitTextToSize(line, pageWidth - margin * 2);
      lines.forEach((splitLine: string) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 30;
        }
        doc.text(splitLine, margin, yPos);
        yPos += lineHeight;
      });
    } else {
      yPos += lineHeight / 2;
    }
  });

  return Buffer.from(doc.output("arraybuffer"));
}

/**
 * Generate Cease & Desist Letter
 */
export async function generateCeaseAndDesistLetter(
  registration: LogoRegistration,
  infringementDetails: {
    infringerName: string;
    infringerAddress?: string;
    infringementDescription: string;
    demandDescription: string;
    deadlineDays: number;
  }
): Promise<Buffer> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const lineHeight = 7;
  let yPos = 30;

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("CEASE AND DESIST LETTER", pageWidth / 2, yPos, { align: "center" });
  yPos += 15;

  // Date and reference
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, yPos);
  yPos += lineHeight;
  doc.text(`Reference: ${registration.id}`, margin, yPos);
  yPos += lineHeight * 2;

  // Recipient
  doc.setFont("helvetica", "bold");
  doc.text("SENT VIA CERTIFIED MAIL AND EMAIL", margin, yPos);
  yPos += lineHeight * 2;

  doc.setFont("helvetica", "normal");
  doc.text(infringementDetails.infringerName, margin, yPos);
  if (infringementDetails.infringerAddress) {
    yPos += lineHeight;
    const addressLines = infringementDetails.infringerAddress.split("\n");
    addressLines.forEach((line) => {
      doc.text(line, margin, yPos);
      yPos += lineHeight;
    });
  }
  yPos += lineHeight * 2;

  // Subject line
  doc.setFont("helvetica", "bold");
  doc.text("RE: CEASE AND DESIST - INTELLECTUAL PROPERTY INFRINGEMENT", margin, yPos);
  yPos += lineHeight * 2;

  // Body
  doc.setFont("helvetica", "normal");
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + infringementDetails.deadlineDays);

  const bodyText = [
    `Dear ${infringementDetails.infringerName}:`,
    "",
    "This letter serves as formal notice that you are infringing upon intellectual property rights owned by " +
      registration.companyName +
      ".",
    "",
    "OWNERSHIP OF INTELLECTUAL PROPERTY:",
    `Our client owns all rights to the following work:`,
    `• Work: ${registration.fileName}`,
    `• Description: ${registration.description}`,
    `• First Use Date: ${registration.registrationDate.toLocaleDateString()}`,
    `• Blockchain Registration: ${registration.id}`,
    "",
    "DESCRIPTION OF INFRINGEMENT:",
    infringementDetails.infringementDescription,
    "",
    "EVIDENCE OF PRIOR ART:",
    `• SHA-256 Hash: ${registration.fileHash}`,
    registration.ipfsHash ? `• IPFS Hash: ${registration.ipfsHash}` : "",
    `• Blockchain Verification: https://solturio.app/verify/${registration.id}`,
    registration.transactionHash ? `• Transaction Hash: ${registration.transactionHash}` : "",
    "",
    "DEMAND:",
    infringementDetails.demandDescription,
    "",
    `You must comply with these demands by ${deadline.toLocaleDateString()} (${infringementDetails.deadlineDays} days from the date of this letter).`,
    "",
    "CONSEQUENCES OF NON-COMPLIANCE:",
    "If you do not cease and desist from your infringing activities, we will have no choice but to pursue all available legal remedies including but not limited to:",
    "• Filing a lawsuit for copyright/trademark infringement",
    "• Seeking monetary damages",
    "• Seeking injunctive relief",
    "• Recovery of attorneys' fees and costs",
    "",
    "This letter is written without prejudice to any rights or remedies available to our client, all of which are expressly reserved.",
    "",
    "We demand that you provide written assurance within the specified timeframe that you will cease and desist from further infringement.",
    "",
    "Sincerely,",
    "",
    "_______________________",
    registration.companyName,
    "Authorized Representative",
  ];

  bodyText.forEach((line) => {
    if (line) {
      const lines = doc.splitTextToSize(line, pageWidth - margin * 2);
      lines.forEach((splitLine: string) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 30;
        }
        doc.text(splitLine, margin, yPos);
        yPos += lineHeight;
      });
    } else {
      yPos += lineHeight / 2;
    }
  });

  return Buffer.from(doc.output("arraybuffer"));
}

/**
 * Generate Evidence Package for legal proceedings
 */
export async function generateEvidencePackage(
  registration: LogoRegistration,
  additionalEvidence?: {
    screenshots?: Array<{ url: string; date: Date; description: string }>;
    witnesses?: Array<{ name: string; email: string; statement: string }>;
    priorUseEvidence?: string[];
  }
): Promise<Buffer> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 30;

  // Title page
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("EVIDENCE PACKAGE", pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  doc.setFontSize(14);
  doc.text("Intellectual Property First Use Documentation", pageWidth / 2, yPos, {
    align: "center",
  });
  yPos += 20;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Case Reference: ${registration.id}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 7;
  doc.text(`Prepared: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos, {
    align: "center",
  });

  // Table of contents
  doc.addPage();
  yPos = 30;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("TABLE OF CONTENTS", margin, yPos);
  yPos += 15;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const contents = [
    "1. Executive Summary",
    "2. Asset Registration Details",
    "3. Blockchain Verification",
    "4. Cryptographic Evidence",
    "5. Timestamp Documentation",
    "6. IP Protection Status",
    "7. Additional Evidence",
    "8. Declaration of Authenticity",
  ];

  contents.forEach((item) => {
    doc.text(item, margin + 10, yPos);
    yPos += 7;
  });

  // Executive Summary
  doc.addPage();
  yPos = 30;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("1. EXECUTIVE SUMMARY", margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const summary = doc.splitTextToSize(
    `This evidence package documents the first use and ownership claim of "${registration.fileName}" by ${registration.companyName}. ` +
      `The asset was registered on ${registration.registrationDate.toLocaleDateString()} with cryptographic verification ` +
      `ensuring the integrity and timestamp of the claim. This package provides comprehensive evidence suitable for ` +
      `legal proceedings, IP disputes, and prior art claims.`,
    pageWidth - margin * 2
  );
  summary.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 7;
  });

  // Continue with detailed sections...
  // This is a comprehensive template - actual implementation would continue
  // with all sections listed in the table of contents

  return Buffer.from(doc.output("arraybuffer"));
}
