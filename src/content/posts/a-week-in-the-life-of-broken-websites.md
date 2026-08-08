---
title: "A week in the life of broken websites"
date: 2026-03-15T14:00:00Z
---
If you work with websites long enough, you start to see patterns.

Most problems aren't dramatic hacks or catastrophic failures. They're quieter than that. Forms that stop sending. Pages that load just slowly enough to hurt conversions. Updates that were left too long.

Here's a fairly typical week. All anonymised, but all very real.

## Monday: "We're not getting any enquiries"

A service business got in touch because leads had dried up. Traffic looked normal. The site was online. Nothing obvious seemed wrong.

The issue? The contact form had stopped sending emails weeks earlier. Messages were being submitted, but they weren't reaching the inbox.

The cause was a mail configuration change on the hosting server combined with outdated form settings.

The fix:

- Reconfigure the mail system properly
- Add authenticated email sending
- Test thoroughly
- Put monitoring in place so it can't fail silently again

Within hours, missed enquiries were recovered and new ones were flowing through correctly.

## Tuesday: The white screen

A company woke up to a completely blank homepage. No warning. No recent changes. Just a white screen.

The site was running on **WordPress**, and the hosting provider had upgraded the server's PHP version overnight. One outdated plugin wasn't compatible with the newer version.

The fix:

- Access the site via the file system    
- Disable the offending plugin
- Replace it with a maintained alternative
- Update other outdated components to prevent repeat issues

The site was restored the same morning. The bigger job was cleaning up years of neglected updates to make it stable long term.

## Wednesday: "It's just really slow"

No error messages this time. Just complaints from customers that the site felt sluggish. Speed tests showed heavy image files, unnecessary plugins, and a bloated theme loading scripts on every page.

The fix:

- Compress and properly size images    
- Remove redundant plugins
- Clean up unused scripts
- Enable proper caching

The result wasn't flashy. The site just felt responsive again. That alone can make a measurable difference in enquiries.

## Thursday: Broken checkout

An online store noticed abandoned carts had spiked. The payment gateway had updated its security requirements. The website's integration hadn't been updated to match.

Customers were hitting an error at the payment stage.

The fix:

- Update the integration    
- Test transactions end to end
- Confirm compliance with the latest security standards

In cases like this, every hour matters. A broken checkout is direct revenue loss.

## Friday: A quiet security issue

A routine check flagged suspicious activity on a small business site. No visible damage yet. But outdated software had created an entry point.

The fix:

- Clean infected files    
- Patch vulnerabilities
- Harden login security
- Set up proper monitoring
- Ensure reliable backups were in place

The client avoided what could have become a much larger reputation issue.

## The common thread

In every case, the business owner hadn't done anything reckless. They were busy running their company. The website just drifted over time.

Software changed. Hosting environments evolved. Integrations updated. Minor issues compounded.

Websites rarely explode. They quietly degrade.

## What makes the difference

The difference between a small hiccup and a major problem is usually attention.

- Regular updates    
- Active monitoring
- Tested backups
- Someone who knows what to look for

When those are in place, most problems are minor and quickly fixed.

When they're not, small issues turn into lost revenue, damaged trust, or emergency rebuilds.

## If your website is misbehaving

If something feels off, whether it's a blank screen, slow performance, missing enquiries, or a vague sense that the site isn't reliable, it's worth checking properly.

I spend my time diagnosing and fixing exactly these kinds of issues. No drama. No unnecessary rebuilds. Just careful investigation and practical fixes.

If your website isn't working the way it should, get in touch and let's sort it out.