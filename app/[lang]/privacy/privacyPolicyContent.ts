import { SUPPORT_EMAIL } from '@/lib/siteContact';

export const BUSINESS_NAME = 'Lanna Bloom';
export const LAST_UPDATED = '18.07.26';

export type PrivacyLocale = 'en' | 'th';

type PrivacyCopy = {
  title: string;
  lastUpdatedLabel: string;
  intro: string;
  dataUse: {
    title: string;
    intro: string;
    dataLabel: string;
    purposeLabel: string;
    rows: readonly (readonly [string, string])[];
    sharing: string;
  };
  legalName: string;
  sections: {
    whoWeAre: {
      heading: string;
      operatedByBefore: string;
      operatedByAfter: string;
      contactPrompt: string;
      emailLabel: string;
    };
    dataWeCollect: {
      heading: string;
      intro: string;
      customerHeading: string;
      customerItems: string[];
      recipientHeading: string;
      recipientIntro: string;
      recipientItems: string[];
      recipientNote: string;
      orderHeading: string;
      orderIntro: string;
      orderItems: string[];
      orderPaymentNote: string;
      websiteHeading: string;
      websiteIntro: string;
      websiteItems: string[];
    };
    howWeUse: {
      heading: string;
      intro: string;
      items: string[];
      outro: string;
    };
    otherPeople: {
      heading: string;
      paragraphs: string[];
    };
    sharing: {
      heading: string;
      intro: string;
      items: string[];
      example: string;
      noSell: string;
    };
    cookies: {
      heading: string;
      essential: string;
      optionalIntro: string;
      items: string[];
      control: string;
      cookiePolicyBefore: string;
      cookiePolicyLabel: string;
      cookiePolicyAfter: string;
    };
    checkoutReminders: {
      heading: string;
      paragraphs: string[];
    };
    international: {
      heading: string;
      paragraphs: string[];
    };
    retention: {
      heading: string;
      intro: string;
      items: string[];
      differentPeriods: string;
      whenNoLongerNeeded: string;
    };
    security: {
      heading: string;
      paragraphs: string[];
    };
    rights: {
      heading: string;
      intro: string;
      items: string[];
      withdrawal: string;
      requestBefore: string;
      requestAfter: string;
    };
    marketing: {
      heading: string;
      paragraphs: string[];
    };
    children: {
      heading: string;
      text: string;
    };
    externalLinks: {
      heading: string;
      text: string;
    };
    changes: {
      heading: string;
      paragraphs: string[];
    };
    contact: {
      heading: string;
      intro: string;
      operatedByLabel: string;
      businessTypeLabel: string;
      businessTypeValue: string;
      emailLabel: string;
    };
  };
};

export const PRIVACY_COPY: Record<PrivacyLocale, PrivacyCopy> = {
  en: {
    title: 'Privacy Policy',
    lastUpdatedLabel: 'Last updated',
    intro: `This Privacy Policy explains how ${BUSINESS_NAME} collects, uses, stores and shares personal data when you visit our website, contact us or place an order.`,
    dataUse: {
      title: 'What we do with your data',
      intro: 'We use your details to complete and deliver your order. We do not sell your personal data.',
      dataLabel: 'Data',
      purposeLabel: 'Why we collect it',
      rows: [
        ['Name', 'To identify you and manage your order'],
        ['Phone number', 'To contact you about your order or delivery'],
        ['Delivery address', 'To deliver the flowers to the correct location'],
        ['Email address', 'To send your order confirmation and essential updates'],
      ],
      sharing:
        'For delivery, we may share the recipient’s name, phone number, address and delivery instructions with our driver or delivery partner.',
    },
    legalName: 'Ms. Worapan Nunthasettha',
    sections: {
      whoWeAre: {
        heading: '1. Who we are',
        operatedByBefore: `${BUSINESS_NAME} is operated by`,
        operatedByAfter: ', a sole proprietor registered in Thailand.',
        contactPrompt: 'For questions or requests concerning personal data, contact us at:',
        emailLabel: 'Email',
      },
      dataWeCollect: {
        heading: '2. Personal data we collect',
        intro: 'Depending on how you use our website and services, we may collect:',
        customerHeading: 'Customer information',
        customerItems: [
          'Name',
          'Email address',
          'Telephone number',
          'Billing and delivery information',
          'Communications with our team',
          'Order history and customer-service records',
        ],
        recipientHeading: 'Recipient and delivery information',
        recipientIntro: 'When you order for another person, we may collect:',
        recipientItems: [
          'Recipient’s name',
          'Recipient’s telephone number',
          'Delivery address or map location',
          'Delivery instructions',
          'Card message',
          'Other information needed to prepare and deliver the order',
        ],
        recipientNote:
          'Please provide only information that is necessary for the delivery and ensure that you are authorised to provide the recipient’s information to us.',
        orderHeading: 'Order and payment information',
        orderIntro: 'We may collect:',
        orderItems: [
          'Products ordered',
          'Order value',
          'Delivery date and time',
          'Payment status',
          'Transaction or order reference',
          'Refund and cancellation information',
        ],
        orderPaymentNote: `Card payments are processed by payment providers such as Stripe. ${BUSINESS_NAME} does not receive or store your complete payment-card details.`,
        websiteHeading: 'Website and device information',
        websiteIntro: 'When you use our website, we may collect information such as:',
        websiteItems: [
          'Pages visited',
          'Buttons and links clicked',
          'Cart and checkout activity',
          'Referring website or campaign',
          'Browser and device type',
          'IP address',
          'Approximate location derived from technical information',
          'Cookie and analytics identifiers',
        ],
      },
      howWeUse: {
        heading: '3. How we use personal data',
        intro: 'We may use personal data to:',
        items: [
          'Create and manage orders',
          'Confirm availability and payment',
          'Prepare bouquets, gifts and card messages',
          'Contact customers and recipients about an order',
          'Calculate and arrange delivery',
          'Share necessary delivery information with authorised team members, florists and drivers',
          'Process payments and refunds',
          'Provide customer support',
          'Resolve delivery, payment or quality issues',
          'Detect fraud, misuse and security problems',
          'Maintain business, accounting and transaction records',
          'Comply with applicable laws and lawful requests',
          'Analyse and improve our website and ordering process',
          'Measure advertising and marketing performance where permitted',
          'Send marketing or checkout reminders when the customer has chosen to receive them',
        ],
        outro:
          'Information required to process and deliver an order is used because it is necessary to provide the service requested by the customer. Optional marketing communications are handled separately.',
      },
      otherPeople: {
        heading: '4. Information about other people',
        paragraphs: [
          'Customers may provide personal information about a recipient or another person when placing an order.',
          'We use that information only as reasonably necessary to prepare the order, contact the recipient, coordinate delivery, resolve problems and provide customer support.',
          'The customer should not include sensitive or unnecessary personal information in delivery instructions or card messages.',
        ],
      },
      sharing: {
        heading: '5. How we share personal data',
        intro: 'We may share only the information reasonably necessary with:',
        items: [
          `Authorised ${BUSINESS_NAME} team members`,
          'Florists preparing the order',
          'Delivery drivers and delivery partners',
          'Payment providers, including Stripe',
          'Website-hosting and technical service providers',
          'Email and customer-communication providers',
          'Order-management providers',
          'Analytics and advertising providers, subject to applicable cookie and consent requirements',
          'Professional advisers or public authorities when required by law or necessary to protect legal rights',
        ],
        example:
          'For example, a florist may need the product and card-message details, while a delivery driver may need the recipient’s name, telephone number, location and delivery instructions.',
        noSell: 'We do not sell personal data.',
      },
      cookies: {
        heading: '6. Cookies, analytics and advertising',
        essential:
          'We use essential cookies and similar technologies to operate the website, maintain the shopping cart, support checkout and protect the website.',
        optionalIntro:
          'With the customer’s choice where required, we may also use analytics or advertising technologies to:',
        items: [
          'Understand how visitors use the website',
          'Identify technical problems',
          'Improve the ordering process',
          'Measure advertising performance',
          'Understand whether an advertisement resulted in an order',
        ],
        control:
          'Optional analytics or advertising cookies should be controlled through the cookie notice or cookie-preference settings.',
        cookiePolicyBefore: 'More information is available in our',
        cookiePolicyLabel: 'Cookie Policy',
        cookiePolicyAfter: '.',
      },
      checkoutReminders: {
        heading: '7. Checkout reminders',
        paragraphs: [
          'When a customer expressly opts in to checkout reminders and begins an order without completing payment, we may send one reminder email approximately 30 minutes later.',
          'The reminder may contain a link that restores the customer’s cart and delivery details. The link expires after three days.',
          'A reminder will not be sent when payment has already been completed. Reminder emails include a method to unsubscribe from future checkout reminders.',
        ],
      },
      international: {
        heading: '8. International data processing',
        paragraphs: [
          'Some service providers, such as payment, hosting, email, analytics or technical providers, may process data using systems located outside Thailand.',
          'Where applicable, we take reasonable steps to use providers and arrangements intended to protect personal data in accordance with applicable requirements.',
        ],
      },
      retention: {
        heading: '9. How long we retain personal data',
        intro:
          'We retain personal data only for as long as reasonably necessary for the purpose for which it was collected, including to:',
        items: [
          'Complete and support orders',
          'Handle refunds, complaints and disputes',
          'Maintain accounting and transaction records',
          'Meet legal, tax and regulatory obligations',
          'Prevent fraud and protect our services',
          'Establish, exercise or defend legal claims',
        ],
        differentPeriods: 'Different categories of information may be retained for different periods.',
        whenNoLongerNeeded:
          'When information is no longer reasonably required, we will delete it, anonymise it or securely restrict its use, subject to technical and legal requirements.',
      },
      security: {
        heading: '10. Data security',
        paragraphs: [
          'We use reasonable technical and organisational measures intended to protect personal data from unauthorised access, loss, misuse, alteration or disclosure.',
          'Access to order and delivery information should be limited to people and service providers who need it to perform their responsibilities.',
          'No online system can be guaranteed to be completely secure. Customers should contact us if they believe their personal information or an order link has been compromised.',
        ],
      },
      rights: {
        heading: '11. Your rights',
        intro: 'Subject to the conditions and exceptions under applicable law, you may have the right to:',
        items: [
          'Request access to your personal data',
          'Request a copy of your personal data',
          'Request correction of inaccurate or incomplete information',
          'Request deletion, destruction or anonymisation',
          'Request restriction of certain processing',
          'Object to certain processing',
          'Request transfer of eligible data',
          'Withdraw consent where processing is based on consent',
          'Submit a complaint to the relevant personal-data protection authority',
        ],
        withdrawal:
          'Withdrawing consent does not affect processing that occurred lawfully before the withdrawal. Some information may still need to be retained or processed to fulfil an order or comply with legal obligations.',
        requestBefore: 'To make a request, email',
        requestAfter: '. We may need to verify your identity before completing the request.',
      },
      marketing: {
        heading: '12. Marketing communications',
        paragraphs: [
          'We may send promotional emails or messages only where the customer has opted in or where another lawful basis applies.',
          'Customers may unsubscribe using the link in an email or by contacting us.',
          'Unsubscribing from marketing does not prevent us from sending necessary messages concerning an active order, payment, delivery, refund or customer-support request.',
        ],
      },
      children: {
        heading: '13. Children’s data',
        text: 'Our services are not directed specifically at children. Customers should not submit unnecessary personal information about children through card messages, delivery notes or other website fields.',
      },
      externalLinks: {
        heading: '14. External links',
        text: 'Our website may contain links to third-party websites or services. Their handling of personal data is governed by their own privacy policies, not this Privacy Policy.',
      },
      changes: {
        heading: '15. Changes to this policy',
        paragraphs: [
          'We may update this Privacy Policy when our services, providers or legal obligations change.',
          'The latest version will be published on this page with an updated revision date. Material changes may also be communicated through the website or another appropriate method.',
        ],
      },
      contact: {
        heading: '16. Contact us',
        intro: 'For questions, concerns or requests regarding this Privacy Policy or your personal data, contact:',
        operatedByLabel: 'Operated by',
        businessTypeLabel: 'Business type',
        businessTypeValue: 'Sole proprietor, Thailand',
        emailLabel: 'Email',
      },
    },
  },
  th: {
    title: 'นโยบายความเป็นส่วนตัว',
    lastUpdatedLabel: 'ปรับปรุงล่าสุด',
    intro: `นโยบายความเป็นส่วนตัวฉบับนี้อธิบายว่า ${BUSINESS_NAME} เก็บรวบรวม ใช้ จัดเก็บ และเปิดเผยข้อมูลส่วนบุคคลอย่างไร เมื่อคุณเข้าชมเว็บไซต์ ติดต่อเรา หรือสั่งซื้อสินค้า`,
    dataUse: {
      title: 'เราใช้ข้อมูลของคุณอย่างไร',
      intro: 'เราใช้ข้อมูลของคุณเพื่อดำเนินการและจัดส่งคำสั่งซื้อ และเราไม่ขายข้อมูลส่วนบุคคลของคุณ',
      dataLabel: 'ข้อมูล',
      purposeLabel: 'เหตุผลที่เก็บรวบรวม',
      rows: [
        ['ชื่อ', 'เพื่อระบุตัวตนและจัดการคำสั่งซื้อ'],
        ['เบอร์โทรศัพท์', 'เพื่อติดต่อเกี่ยวกับคำสั่งซื้อหรือการจัดส่ง'],
        ['ที่อยู่จัดส่ง', 'เพื่อจัดส่งดอกไม้ไปยังสถานที่ที่ถูกต้อง'],
        ['อีเมล', 'เพื่อส่งการยืนยันคำสั่งซื้อและข้อมูลสำคัญ'],
      ],
      sharing:
        'เพื่อดำเนินการจัดส่ง เราอาจเปิดเผยชื่อผู้รับ เบอร์โทรศัพท์ ที่อยู่ และคำแนะนำในการจัดส่งแก่พนักงานหรือพันธมิตรด้านการจัดส่งของเรา',
    },
    legalName: 'คุณ Worapan Nunthasettha',
    sections: {
      whoWeAre: {
        heading: '1. เราคือใคร',
        operatedByBefore: `${BUSINESS_NAME} ดำเนินกิจการโดย`,
        operatedByAfter: ' ซึ่งเป็นผู้ประกอบการเจ้าของคนเดียวที่จดทะเบียนในประเทศไทย',
        contactPrompt: 'หากมีคำถามหรือประสงค์จะยื่นคำขอเกี่ยวกับข้อมูลส่วนบุคคล กรุณาติดต่อเราได้ที่:',
        emailLabel: 'อีเมล',
      },
      dataWeCollect: {
        heading: '2. ข้อมูลส่วนบุคคลที่เราเก็บรวบรวม',
        intro: 'ข้อมูลที่เราอาจเก็บรวบรวมขึ้นอยู่กับวิธีที่คุณใช้เว็บไซต์และบริการของเรา',
        customerHeading: 'ข้อมูลของลูกค้า',
        customerItems: [
          'ชื่อ',
          'ที่อยู่อีเมล',
          'เบอร์โทรศัพท์',
          'ข้อมูลสำหรับออกใบเรียกเก็บเงินและการจัดส่ง',
          'ข้อความหรือการติดต่อสื่อสารกับทีมงานของเรา',
          'ประวัติคำสั่งซื้อและข้อมูลการให้บริการลูกค้า',
        ],
        recipientHeading: 'ข้อมูลของผู้รับและข้อมูลการจัดส่ง',
        recipientIntro: 'เมื่อคุณสั่งซื้อสินค้าให้แก่บุคคลอื่น เราอาจเก็บรวบรวมข้อมูลดังต่อไปนี้:',
        recipientItems: [
          'ชื่อผู้รับ',
          'เบอร์โทรศัพท์ของผู้รับ',
          'ที่อยู่จัดส่งหรือตำแหน่งบนแผนที่',
          'คำแนะนำในการจัดส่ง',
          'ข้อความสำหรับการ์ด',
          'ข้อมูลอื่นที่จำเป็นต่อการจัดเตรียมและจัดส่งคำสั่งซื้อ',
        ],
        recipientNote:
          'โปรดให้เฉพาะข้อมูลที่จำเป็นต่อการจัดส่ง และตรวจสอบให้แน่ใจว่าคุณมีสิทธิหรือได้รับอนุญาตให้นำข้อมูลของผู้รับมาให้แก่เรา',
        orderHeading: 'ข้อมูลคำสั่งซื้อและการชำระเงิน',
        orderIntro: 'เราอาจเก็บรวบรวมข้อมูลดังต่อไปนี้:',
        orderItems: [
          'สินค้าที่สั่งซื้อ',
          'มูลค่าคำสั่งซื้อ',
          'วันที่และเวลาจัดส่ง',
          'สถานะการชำระเงิน',
          'หมายเลขอ้างอิงธุรกรรมหรือคำสั่งซื้อ',
          'ข้อมูลเกี่ยวกับการคืนเงินและการยกเลิกคำสั่งซื้อ',
        ],
        orderPaymentNote: `การชำระเงินด้วยบัตรจะได้รับการประมวลผลโดยผู้ให้บริการชำระเงิน เช่น Stripe โดย ${BUSINESS_NAME} จะไม่ได้รับหรือจัดเก็บรายละเอียดบัตรชำระเงินของคุณแบบครบถ้วน`,
        websiteHeading: 'ข้อมูลเว็บไซต์และอุปกรณ์',
        websiteIntro: 'เมื่อคุณใช้เว็บไซต์ของเรา เราอาจเก็บรวบรวมข้อมูล เช่น:',
        websiteItems: [
          'หน้าที่เข้าชม',
          'ปุ่มและลิงก์ที่คลิก',
          'กิจกรรมในตะกร้าสินค้าและขั้นตอนการชำระเงิน',
          'เว็บไซต์หรือแคมเปญที่นำคุณมายังเว็บไซต์ของเรา',
          'ประเภทเบราว์เซอร์และอุปกรณ์',
          'ที่อยู่ IP',
          'ตำแหน่งโดยประมาณที่ได้จากข้อมูลทางเทคนิค',
          'ตัวระบุจากคุกกี้และระบบวิเคราะห์ข้อมูล',
        ],
      },
      howWeUse: {
        heading: '3. วิธีที่เราใช้ข้อมูลส่วนบุคคล',
        intro: 'เราอาจใช้ข้อมูลส่วนบุคคลเพื่อ:',
        items: [
          'สร้างและจัดการคำสั่งซื้อ',
          'ยืนยันความพร้อมของสินค้าและการชำระเงิน',
          'จัดเตรียมช่อดอกไม้ ของขวัญ และข้อความในการ์ด',
          'ติดต่อลูกค้าและผู้รับเกี่ยวกับคำสั่งซื้อ',
          'คำนวณและจัดเตรียมการจัดส่ง',
          'เปิดเผยข้อมูลการจัดส่งที่จำเป็นให้แก่ทีมงาน ร้านดอกไม้ และพนักงานจัดส่งที่ได้รับอนุญาต',
          'ดำเนินการชำระเงินและคืนเงิน',
          'ให้บริการลูกค้า',
          'แก้ไขปัญหาเกี่ยวกับการจัดส่ง การชำระเงิน หรือคุณภาพสินค้า',
          'ตรวจจับการฉ้อโกง การใช้งานโดยมิชอบ และปัญหาด้านความปลอดภัย',
          'จัดเก็บบันทึกทางธุรกิจ บัญชี และธุรกรรม',
          'ปฏิบัติตามกฎหมายและคำร้องขอที่ชอบด้วยกฎหมาย',
          'วิเคราะห์และปรับปรุงเว็บไซต์และขั้นตอนการสั่งซื้อ',
          'วัดประสิทธิภาพของการโฆษณาและการตลาดในกรณีที่กฎหมายอนุญาต',
          'ส่งข้อความทางการตลาดหรือข้อความเตือนเกี่ยวกับการชำระเงิน เมื่อคุณเลือกที่จะรับข้อความดังกล่าว',
        ],
        outro:
          'ข้อมูลที่จำเป็นต่อการดำเนินการและจัดส่งคำสั่งซื้อจะถูกนำไปใช้เพื่อให้บริการตามที่ลูกค้าร้องขอ ส่วนข้อความทางการตลาดที่ไม่จำเป็นจะได้รับการจัดการแยกต่างหาก',
      },
      otherPeople: {
        heading: '4. ข้อมูลเกี่ยวกับบุคคลอื่น',
        paragraphs: [
          'ลูกค้าอาจให้ข้อมูลส่วนบุคคลของผู้รับหรือบุคคลอื่นแก่เราเมื่อทำการสั่งซื้อ',
          'เราจะใช้ข้อมูลดังกล่าวเท่าที่จำเป็นเพื่อจัดเตรียมคำสั่งซื้อ ติดต่อผู้รับ ประสานงานการจัดส่ง แก้ไขปัญหา และให้บริการลูกค้า',
          'ลูกค้าไม่ควรใส่ข้อมูลส่วนบุคคลที่มีความอ่อนไหวหรือข้อมูลที่ไม่จำเป็นไว้ในคำแนะนำในการจัดส่งหรือข้อความในการ์ด',
        ],
      },
      sharing: {
        heading: '5. วิธีที่เราเปิดเผยข้อมูลส่วนบุคคล',
        intro: 'เราอาจเปิดเผยเฉพาะข้อมูลที่มีความจำเป็นอย่างสมเหตุสมผลให้แก่:',
        items: [
          `สมาชิกทีมงาน ${BUSINESS_NAME} ที่ได้รับอนุญาต`,
          'ร้านดอกไม้หรือผู้จัดเตรียมคำสั่งซื้อ',
          'พนักงานจัดส่งและพันธมิตรด้านการจัดส่ง',
          'ผู้ให้บริการชำระเงิน รวมถึง Stripe',
          'ผู้ให้บริการโฮสติ้งเว็บไซต์และบริการทางเทคนิค',
          'ผู้ให้บริการอีเมลและระบบติดต่อสื่อสารกับลูกค้า',
          'ผู้ให้บริการระบบจัดการคำสั่งซื้อ',
          'ผู้ให้บริการระบบวิเคราะห์ข้อมูลและโฆษณา โดยเป็นไปตามข้อกำหนดเรื่องคุกกี้และความยินยอมที่เกี่ยวข้อง',
          'ที่ปรึกษาวิชาชีพหรือหน่วยงานของรัฐ เมื่อกฎหมายกำหนดหรือเมื่อจำเป็นต่อการคุ้มครองสิทธิตามกฎหมาย',
        ],
        example:
          'ตัวอย่างเช่น ร้านดอกไม้อาจจำเป็นต้องทราบรายละเอียดสินค้าและข้อความในการ์ด ขณะที่พนักงานจัดส่งอาจจำเป็นต้องทราบชื่อผู้รับ เบอร์โทรศัพท์ ตำแหน่ง และคำแนะนำในการจัดส่ง',
        noSell: 'เราไม่ขายข้อมูลส่วนบุคคล',
      },
      cookies: {
        heading: '6. คุกกี้ ระบบวิเคราะห์ข้อมูล และการโฆษณา',
        essential:
          'เราใช้คุกกี้ที่จำเป็นและเทคโนโลยีที่คล้ายกันเพื่อให้เว็บไซต์ทำงานได้ รักษาข้อมูลในตะกร้าสินค้า รองรับขั้นตอนการชำระเงิน และปกป้องความปลอดภัยของเว็บไซต์',
        optionalIntro: 'เมื่อจำเป็นต้องได้รับการยินยอมจากลูกค้า เราอาจใช้เทคโนโลยีสำหรับการวิเคราะห์ข้อมูลหรือการโฆษณาเพื่อ:',
        items: [
          'ทำความเข้าใจว่าผู้เข้าชมใช้งานเว็บไซต์อย่างไร',
          'ตรวจหาปัญหาทางเทคนิค',
          'ปรับปรุงขั้นตอนการสั่งซื้อ',
          'วัดประสิทธิภาพของการโฆษณา',
          'ตรวจสอบว่าโฆษณานำไปสู่การสั่งซื้อหรือไม่',
        ],
        control: 'ลูกค้าสามารถควบคุมคุกกี้สำหรับการวิเคราะห์ข้อมูลหรือการโฆษณาที่ไม่จำเป็นผ่านประกาศคุกกี้หรือการตั้งค่าคุกกี้',
        cookiePolicyBefore: 'ดูข้อมูลเพิ่มเติมได้ใน',
        cookiePolicyLabel: 'นโยบายคุกกี้',
        cookiePolicyAfter: 'ของเรา',
      },
      checkoutReminders: {
        heading: '7. ข้อความเตือนเกี่ยวกับการชำระเงิน',
        paragraphs: [
          'เมื่อลูกค้าเลือกและให้ความยินยอมอย่างชัดเจนในการรับข้อความเตือนเกี่ยวกับการชำระเงิน และได้เริ่มทำคำสั่งซื้อแต่ยังไม่ได้ชำระเงิน เราอาจส่งอีเมลเตือนหนึ่งฉบับภายในเวลาประมาณ 30 นาที',
          'อีเมลดังกล่าวอาจมีลิงก์สำหรับกู้คืนตะกร้าสินค้าและรายละเอียดการจัดส่งของลูกค้า โดยลิงก์จะหมดอายุภายในสามวัน',
          'เราจะไม่ส่งข้อความเตือนหากลูกค้าชำระเงินเรียบร้อยแล้ว และอีเมลเตือนทุกฉบับจะมีช่องทางสำหรับยกเลิกการรับข้อความเตือนในอนาคต',
        ],
      },
      international: {
        heading: '8. การประมวลผลข้อมูลระหว่างประเทศ',
        paragraphs: [
          'ผู้ให้บริการบางราย เช่น ผู้ให้บริการชำระเงิน โฮสติ้ง อีเมล ระบบวิเคราะห์ข้อมูล หรือบริการทางเทคนิค อาจประมวลผลข้อมูลผ่านระบบที่ตั้งอยู่นอกประเทศไทย',
          'ในกรณีที่เกี่ยวข้อง เราจะใช้มาตรการที่เหมาะสมในการเลือกผู้ให้บริการและข้อตกลงที่มีวัตถุประสงค์เพื่อคุ้มครองข้อมูลส่วนบุคคลตามข้อกำหนดที่ใช้บังคับ',
        ],
      },
      retention: {
        heading: '9. ระยะเวลาที่เราเก็บรักษาข้อมูลส่วนบุคคล',
        intro: 'เราจะเก็บรักษาข้อมูลส่วนบุคคลไว้เท่าที่มีความจำเป็นอย่างสมเหตุสมผลตามวัตถุประสงค์ที่เก็บรวบรวมข้อมูล รวมถึงเพื่อ:',
        items: [
          'ดำเนินการและให้ความช่วยเหลือเกี่ยวกับคำสั่งซื้อ',
          'จัดการการคืนเงิน ข้อร้องเรียน และข้อพิพาท',
          'เก็บรักษาบันทึกทางบัญชีและธุรกรรม',
          'ปฏิบัติตามหน้าที่ทางกฎหมาย ภาษี และกฎระเบียบ',
          'ป้องกันการฉ้อโกงและคุ้มครองบริการของเรา',
          'ก่อตั้ง ใช้ หรือปกป้องสิทธิเรียกร้องตามกฎหมาย',
        ],
        differentPeriods: 'ข้อมูลแต่ละประเภทอาจมีระยะเวลาการเก็บรักษาที่แตกต่างกัน',
        whenNoLongerNeeded:
          'เมื่อข้อมูลไม่มีความจำเป็นอย่างสมเหตุสมผลอีกต่อไป เราจะลบข้อมูล ทำให้ข้อมูลไม่สามารถระบุตัวบุคคลได้ หรือจำกัดการใช้งานอย่างปลอดภัย โดยเป็นไปตามข้อกำหนดทางเทคนิคและกฎหมาย',
      },
      security: {
        heading: '10. ความปลอดภัยของข้อมูล',
        paragraphs: [
          'เราใช้มาตรการทางเทคนิคและการบริหารจัดการที่เหมาะสมเพื่อคุ้มครองข้อมูลส่วนบุคคลจากการเข้าถึงโดยไม่ได้รับอนุญาต การสูญหาย การใช้ในทางที่ผิด การแก้ไข หรือการเปิดเผย',
          'การเข้าถึงข้อมูลคำสั่งซื้อและข้อมูลการจัดส่งควรถูกจำกัดเฉพาะบุคคลและผู้ให้บริการที่จำเป็นต้องใช้ข้อมูลเพื่อปฏิบัติหน้าที่เท่านั้น',
          'อย่างไรก็ตาม ไม่มีระบบออนไลน์ใดที่สามารถรับประกันความปลอดภัยได้อย่างสมบูรณ์ หากลูกค้าเชื่อว่าข้อมูลส่วนบุคคลหรือลิงก์คำสั่งซื้อถูกเข้าถึงโดยไม่ได้รับอนุญาต กรุณาติดต่อเรา',
        ],
      },
      rights: {
        heading: '11. สิทธิของคุณ',
        intro: 'ภายใต้เงื่อนไขและข้อยกเว้นตามกฎหมายที่ใช้บังคับ คุณอาจมีสิทธิในการ:',
        items: [
          'ขอเข้าถึงข้อมูลส่วนบุคคลของคุณ',
          'ขอรับสำเนาข้อมูลส่วนบุคคลของคุณ',
          'ขอแก้ไขข้อมูลที่ไม่ถูกต้องหรือไม่ครบถ้วน',
          'ขอให้ลบ ทำลาย หรือทำให้ข้อมูลไม่สามารถระบุตัวบุคคลได้',
          'ขอให้จำกัดการประมวลผลบางประเภท',
          'คัดค้านการประมวลผลบางประเภท',
          'ขอให้โอนข้อมูลที่เข้าเงื่อนไข',
          'ถอนความยินยอมในกรณีที่การประมวลผลอาศัยความยินยอม',
          'ยื่นข้อร้องเรียนต่อหน่วยงานคุ้มครองข้อมูลส่วนบุคคลที่เกี่ยวข้อง',
        ],
        withdrawal:
          'การถอนความยินยอมจะไม่กระทบต่อการประมวลผลที่ดำเนินการโดยชอบด้วยกฎหมายก่อนการถอนความยินยอม ข้อมูลบางประเภทอาจยังคงต้องได้รับการจัดเก็บหรือประมวลผลเพื่อดำเนินการตามคำสั่งซื้อหรือปฏิบัติตามหน้าที่ทางกฎหมาย',
        requestBefore: 'หากต้องการใช้สิทธิ กรุณาส่งอีเมลไปที่',
        requestAfter: ' เราอาจต้องตรวจสอบยืนยันตัวตนของคุณก่อนดำเนินการตามคำขอ',
      },
      marketing: {
        heading: '12. การติดต่อสื่อสารทางการตลาด',
        paragraphs: [
          'เราอาจส่งอีเมลหรือข้อความส่งเสริมการขายเฉพาะในกรณีที่ลูกค้าเลือกสมัครรับข้อมูล หรือในกรณีที่มีกฎหมายรองรับการดำเนินการดังกล่าว',
          'ลูกค้าสามารถยกเลิกการรับข้อความได้ผ่านลิงก์ในอีเมลหรือติดต่อเราโดยตรง',
          'การยกเลิกรับข้อความทางการตลาดจะไม่ทำให้ลูกค้าพลาดข้อความที่จำเป็นเกี่ยวกับคำสั่งซื้อที่กำลังดำเนินการ การชำระเงิน การจัดส่ง การคืนเงิน หรือการให้บริการลูกค้า',
        ],
      },
      children: {
        heading: '13. ข้อมูลของเด็ก',
        text: 'บริการของเราไม่ได้มุ่งเน้นไปที่เด็กโดยเฉพาะ ลูกค้าไม่ควรส่งข้อมูลส่วนบุคคลของเด็กที่ไม่จำเป็นผ่านข้อความในการ์ด หมายเหตุการจัดส่ง หรือช่องข้อมูลอื่นบนเว็บไซต์',
      },
      externalLinks: {
        heading: '14. ลิงก์ภายนอก',
        text: 'เว็บไซต์ของเราอาจมีลิงก์ไปยังเว็บไซต์หรือบริการของบุคคลภายนอก การจัดการข้อมูลส่วนบุคคลของบุคคลภายนอกจะอยู่ภายใต้นโยบายความเป็นส่วนตัวของบุคคลเหล่านั้น ไม่ใช่นโยบายความเป็นส่วนตัวฉบับนี้',
      },
      changes: {
        heading: '15. การเปลี่ยนแปลงนโยบายฉบับนี้',
        paragraphs: [
          'เราอาจปรับปรุงนโยบายความเป็นส่วนตัวฉบับนี้เมื่อบริการ ผู้ให้บริการ หรือหน้าที่ตามกฎหมายของเรามีการเปลี่ยนแปลง',
          'นโยบายฉบับล่าสุดจะถูกเผยแพร่บนหน้านี้พร้อมวันที่ปรับปรุง หากมีการเปลี่ยนแปลงที่สำคัญ เราอาจแจ้งให้ทราบผ่านเว็บไซต์หรือช่องทางอื่นที่เหมาะสม',
        ],
      },
      contact: {
        heading: '16. ติดต่อเรา',
        intro: 'หากมีคำถาม ข้อกังวล หรือประสงค์จะยื่นคำขอเกี่ยวกับนโยบายความเป็นส่วนตัวหรือข้อมูลส่วนบุคคลของคุณ กรุณาติดต่อ:',
        operatedByLabel: 'ผู้ดำเนินกิจการ',
        businessTypeLabel: 'ประเภทธุรกิจ',
        businessTypeValue: 'ผู้ประกอบการเจ้าของคนเดียว ประเทศไทย',
        emailLabel: 'อีเมล',
      },
    },
  },
};

export function getPrivacyCopy(locale: string): PrivacyCopy {
  return locale === 'th' ? PRIVACY_COPY.th : PRIVACY_COPY.en;
}

export { SUPPORT_EMAIL };
