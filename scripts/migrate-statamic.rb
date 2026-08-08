require "json"
require "fileutils"
require "yaml"

source_root = File.expand_path(ARGV.fetch(0))
pages_output = File.expand_path("../src/content/pages", __dir__)
posts_output = File.expand_path("../src/content/posts", __dir__)

FileUtils.mkdir_p(pages_output)
FileUtils.mkdir_p(posts_output)

def split_frontmatter(markdown)
  match = markdown.match(/\A---\n(.*?)\n---\n?(.*)\z/m)
  raise "Invalid frontmatter" unless match

  [YAML.safe_load(match[1]), match[2]]
end

Dir.glob(File.join(pages_output, "*.md")).each { |file| File.delete(file) }
Dir.glob(File.join(posts_output, "*.md")).each { |file| File.delete(file) }

Dir.glob(File.join(source_root, "content/collections/pages/*.md")).sort.each do |source|
  next if File.basename(source) == "blog.md"

  data, = split_frontmatter(File.read(source))
  output = ["---", "title: #{data.fetch("title").to_json}", "---", ""]

  data.fetch("content").each do |block|
    next unless block.fetch("enabled", true)

    case block.fetch("type")
    when "hero", "section"
      output << "{% section #{block.fetch("type").to_json}, #{block.fetch("title").to_json} %}"
      output << block.fetch("content").rstrip
      output << "{% endsection %}"
    when "cta"
      output << "{% cta #{block.fetch("button_link").to_json}, #{block.fetch("button_label").to_json} %}"
      output << block.fetch("content").rstrip
      output << "{% endcta %}"
    else
      raise "Unsupported block type: #{block.fetch("type")}" 
    end

    output << ""
  end

  File.write(File.join(pages_output, File.basename(source)), output.join("\n").rstrip + "\n")
end

Dir.glob(File.join(source_root, "content/collections/blog/*.md")).sort.each do |source|
  data, body = split_frontmatter(File.read(source))
  filename = File.basename(source)
  match = filename.match(/\A(\d{4}-\d{2}-\d{2})-(\d{2})(\d{2})\.(.+)\.md\z/)
  raise "Unexpected post filename: #{filename}" unless match

  frontmatter = [
    "---",
    "title: #{data.fetch("title").to_json}",
    "date: #{match[1]}T#{match[2]}:#{match[3]}:00Z",
  ]
  frontmatter << "cta_body: #{data["cta_body"].to_json}" if data["cta_body"]
  frontmatter << "cta_button_label: #{data["cta_button_label"].to_json}" if data["cta_button_label"]
  frontmatter << "---"

  File.write(File.join(posts_output, "#{match[4]}.md"), frontmatter.join("\n") + "\n" + body)
end
