
// Placeholder page for Privacy Policy
export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
      <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>
      <div className="prose prose-lg max-w-none text-muted-foreground">
        <p>Your privacy is important to us. It is LISTED's policy to respect your privacy regarding any information we may collect from you across our website, [YourWebsiteURL.com], and other sites we own and operate.</p>
        
        <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">Information We Collect</h2>
        <p>We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we’re collecting it and how it will be used.</p>
        <p>Information we collect may include:</p>
        <ul>
            <li>Name</li>
            <li>Email address</li>
            <li>Contact number</li>
            <li>Business information (for corporations and professionals)</li>
            <li>Investment preferences (for investors)</li>
            <li>Usage data and analytics</li>
        </ul>

        <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">How We Use Your Information</h2>
        <p>We use the collected information to:</p>
        <ul>
            <li>Provide, operate, and maintain our platform</li>
            <li>Improve, personalize, and expand our platform</li>
            <li>Understand and analyze how you use our platform</li>
            <li>Develop new products, services, features, and functionality</li>
            <li>Communicate with you, either directly or through one of our partners, including for customer service, to provide you with updates and other information relating to the website, and for marketing and promotional purposes</li>
            <li>Process your transactions</li>
            <li>Find and prevent fraud</li>
        </ul>
        
        <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">Log Files</h2>
        <p>LISTED follows a standard procedure of using log files. These files log visitors when they visit websites. All hosting companies do this and a part of hosting services' analytics. The information collected by log files include internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks. These are not linked to any information that is personally identifiable. The purpose of the information is for analyzing trends, administering the site, tracking users' movement on the website, and gathering demographic information.</p>

        {/* Add more sections: Cookies, Security, Third-Party Links, Children's Privacy, Changes to This Policy, Contact Us */}
        <p className="mt-10"><strong>Last updated:</strong> {new Date().toLocaleDateString()}</p>
        <p>This is a template Privacy Policy. It is crucial to tailor this policy to your specific data practices and consult with a legal professional to ensure compliance with all applicable privacy laws and regulations.</p>
      </div>
    </div>
  );
}
