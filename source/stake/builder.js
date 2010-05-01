Stake.extend({
  Builder: new JS.Class({
    initialize: function(parent) {
      if (parent) {
        this._parent = parent;
        this._indentLevel = parent._indentLevel;
      } else {
        this._buffer = '';
        this._indentLevel = 0;
      }
      this._methodSeparator = '';
      this._varIndex = {};
    },
    
    serialize: function() {
      return this._buffer;
    },
    
    write: function(string) {
      if (this._parent) return this._parent.write(string);
      this._buffer += string;
    },
    
    indent_: function(block, context) {
      this._indentLevel += 1;
      block.call(context, this);
      this._indentLevel -= 1;
    },
    
    newline_: function() {
      this.write('\n');
      var i = this._indentLevel;
      while (i--) this.write('    ');
    },
    
    delimitField_: function() {
      this.write(this._methodSeparator);
      this._methodSeparator = ',';
    },
    
    line_: function(source) {
      this.newline_();
      this.write(source + ';');
    },
    
    input_: function() {
      return 'this._input';
    },
    
    offset_: function() {
      return 'this._offset';
    },
    
    slice_: function(length) {
      var input = this.input_(), of = this.offset_();
      return input + '.substring(' + of + ', ' + of + ' + ' + length + ')';
    },
    
    syntaxNode_: function(address, nodeType, expression, bump, elements, labelled) {
      elements = ', ' + (elements || '[]');
      labelled = labelled ? ', ' + labelled : '';
      var klass, of = ', ' + this.offset_();
      
      if (nodeType) {
        klass = this.tempVar_('klass');
        this.if_(nodeType + ' instanceof Function', function(builder) {
          builder.line_(klass + ' = ' + nodeType);
        });
        this.else_(function(builder) {
          builder.line_(klass + ' = Stake.SyntaxNode');
        });
      } else {
        klass = this.tempVar_('klass', 'Stake.SyntaxNode');
      }
      
      this.line_(address + ' = new ' + klass + '(' + expression + of + elements + labelled + ')');
      this.extendNode_(address, nodeType);
      this.line_(this.offset_() + ' += ' + bump);
    },
    
    extendNode_: function(address, nodeType) {
      if (!nodeType) return;
      this.unless_(nodeType + ' instanceof Function', function(builder) {
        builder.line_(address + '.extend(' + nodeType + ')');
      });
    },
    
    failure_: function(address) {
      this.line_(address + ' = null');
    },
    
    nameSpace_: function(objectName) {
      var parts = objectName.split('.');
      this.line_('(function(global) {');
      this.indent_(function() {
        this.var_('namespace', 'global');
        for (var i = 0, n = parts.length; i < n - 1; i++)
          this.line_('namespace = namespace.' + parts[i] + ' = namespace.' + parts[i] + ' || {}');
      }, this);
      this.line_('})(this)');
    },
    
    module_: function(name, block, context) {
      this.newline_();
      this.write(name + ' = new JS.Module("' + name + '", {');
      new Stake.Builder(this).indent_(block, context);
      this.newline_();
      this.write('});');
    },
    
    class_: function(name, block, context) {
      this.newline_();
      this.write(name + ' = new JS.Class("' + name + '", {');
      new Stake.Builder(this).indent_(block, context);
      this.newline_();
      this.write('});');
    },
    
    include_: function(name) {
      this.delimitField_();
      this.newline_();
      this.write('include: ' + name);
    },
    
    classMethods_: function(block, context) {
      this.delimitField_();
      this.newline_();
      this.write('extend: {');
      new Stake.Builder(this).indent_(block, context);
      this.newline_();
      this.write('}');
    },
    
    field_: function(name, value) {
      this.delimitField_();
      this.newline_();
      this.write(name + ': ' + value);
    },
    
    method_: function(name, args, block, context) {
      this.delimitField_();
      this.newline_();
      this.write(name + ': function(' + args.join(', ') + ') {');
      this._varIndex = {};
      this.indent_(block, context);
      this.newline_();
      this.write('}');
    },
    
    ivar_: function(name, value) {
      this.line_('this._' + name + ' = ' + value);
    },
    
    var_: function() {
      for (var i = 0, n = arguments.length; i < n; i += 2)
        this.line_('var ' + arguments[i] + ' = ' + arguments[i+1]);
    },
    
    tempVar_: function(name, value) {
      this._varIndex[name] = this._varIndex[name] || 0;
      var varName = name + this._varIndex[name];
      this._varIndex[name] += 1;
      this.var_(varName, value || 'null');
      return varName;
    },
    
    conditional_: function(kwd, condition, block, context) {
      this.newline_();
      this.write(kwd + ' (' + condition + ') {');
      this.indent_(block, context);
      this.newline_();
      this.write('}');
    },
    
    while_: function(condition, block, context) {
      this.conditional_('while', condition, block, context);
    },
    
    if_: function(condition, block, context) {
      this.conditional_('if', condition, block, context);
    },
    
    unless_: function(condition, block, context) {
      this.conditional_('if', '!(' + condition + ')', block, context);
    },
    
    else_: function(block, context) {
      this.write(' else {');
      this.indent_(block, context);
      this.newline_();
      this.write('}');
    },
    
    return_: function(expression) {
      this.line_('return ' + expression);
    }
  })
});

